import React, { useRef, useEffect, useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useStore } from '../store';

const COLORS = ['#FFD700', '#FF6B35', '#22C55E', '#3B82F6', '#A855F7', '#EC4899', '#EF4444', '#FFFFFF', '#000000', '#14B8A6', '#F97316', '#8B5CF6'];
const FONT_SIZES = [14, 18, 24, 32, 48, 64];
const STROKE_WIDTHS = [2, 4, 6, 10, 16];

type Tool = 'select' | 'pen' | 'text' | 'highlight' | 'arrow' | 'shape' | 'sticky' | 'eraser' | 'line';

interface Point {
  x: number;
  y: number;
}

interface DrawingElement {
  id: string;
  type: 'drawing' | 'highlight' | 'text' | 'arrow' | 'shape' | 'sticky' | 'line';
  points?: Point[];
  x: number;
  y: number;
  width?: number;
  height?: number;
  content?: string;
  color: string;
  fontSize?: number;
  fontWeight?: 'normal' | 'bold';
  fontStyle?: 'normal' | 'italic';
  textDecoration?: 'none' | 'underline';
  strokeWidth?: number;
  shapeType?: 'rect' | 'circle' | 'triangle' | 'line';
}

// Smart shape detection
function detectShape(points: Point[]): { type: 'rect' | 'circle' | 'triangle' | 'line' | 'freeform'; bounds: { x: number; y: number; width: number; height: number } } {
  if (points.length < 3) return { type: 'freeform', bounds: getBounds(points) };

  const bounds = getBounds(points);
  const { width, height } = bounds;
  
  // Check for line (mostly straight)
  if (isLine(points)) {
    return { type: 'line', bounds };
  }
  
  // Check if shape is closed (start and end near each other)
  const start = points[0];
  const end = points[points.length - 1];
  const dist = Math.sqrt((end.x - start.x) ** 2 + (end.y - start.y) ** 2);
  const isClosed = dist < Math.max(width, height) * 0.3;
  
  if (!isClosed) return { type: 'freeform', bounds };
  
  // Check for circle (points roughly equidistant from center)
  const centerX = bounds.x + width / 2;
  const centerY = bounds.y + height / 2;
  const avgRadius = (width + height) / 4;
  let circleScore = 0;
  points.forEach(p => {
    const d = Math.sqrt((p.x - centerX) ** 2 + (p.y - centerY) ** 2);
    if (Math.abs(d - avgRadius) < avgRadius * 0.25) circleScore++;
  });
  if (circleScore / points.length > 0.7 && Math.abs(width - height) < Math.max(width, height) * 0.3) {
    return { type: 'circle', bounds };
  }
  
  // Check for triangle (3 distinct corners)
  const corners = findCorners(points);
  if (corners.length >= 2 && corners.length <= 4) {
    if (corners.length === 3) return { type: 'triangle', bounds };
  }
  
  // Check for rectangle (4 corners, right angles)
  const aspectRatio = width / height;
  if (aspectRatio > 0.3 && aspectRatio < 3 && corners.length >= 3) {
    return { type: 'rect', bounds };
  }
  
  return { type: 'freeform', bounds };
}

function getBounds(points: Point[]): { x: number; y: number; width: number; height: number } {
  if (points.length === 0) return { x: 0, y: 0, width: 0, height: 0 };
  let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
  points.forEach(p => {
    minX = Math.min(minX, p.x);
    minY = Math.min(minY, p.y);
    maxX = Math.max(maxX, p.x);
    maxY = Math.max(maxY, p.y);
  });
  return { x: minX, y: minY, width: maxX - minX, height: maxY - minY };
}

function isLine(points: Point[]): boolean {
  if (points.length < 2) return false;
  const start = points[0];
  const end = points[points.length - 1];
  const lineLen = Math.sqrt((end.x - start.x) ** 2 + (end.y - start.y) ** 2);
  if (lineLen < 30) return false;
  
  let maxDev = 0;
  points.forEach(p => {
    const d = pointToLineDistance(p, start, end);
    maxDev = Math.max(maxDev, d);
  });
  return maxDev < lineLen * 0.1;
}

function pointToLineDistance(p: Point, a: Point, b: Point): number {
  const A = p.x - a.x;
  const B = p.y - a.y;
  const C = b.x - a.x;
  const D = b.y - a.y;
  const dot = A * C + B * D;
  const lenSq = C * C + D * D;
  let param = -1;
  if (lenSq !== 0) param = dot / lenSq;
  let xx, yy;
  if (param < 0) { xx = a.x; yy = a.y; }
  else if (param > 1) { xx = b.x; yy = b.y; }
  else { xx = a.x + param * C; yy = a.y + param * D; }
  return Math.sqrt((p.x - xx) ** 2 + (p.y - yy) ** 2);
}

function findCorners(points: Point[]): Point[] {
  if (points.length < 5) return [];
  const corners: Point[] = [];
  const threshold = 0.5; // radians
  
  for (let i = 2; i < points.length - 2; i++) {
    const prev = points[i - 2];
    const curr = points[i];
    const next = points[i + 2];
    
    const angle1 = Math.atan2(curr.y - prev.y, curr.x - prev.x);
    const angle2 = Math.atan2(next.y - curr.y, next.x - curr.x);
    let diff = Math.abs(angle2 - angle1);
    if (diff > Math.PI) diff = 2 * Math.PI - diff;
    
    if (diff > threshold) {
      corners.push(curr);
    }
  }
  return corners;
}

export const Whiteboard: React.FC = () => {
  const {
    whiteboardActive, setWhiteboardActive,
    saveWhiteboardState, whiteboardSavedStates,
    currentTime, lesson, setIsPlaying,
  } = useStore();

  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [elements, setElements] = useState<DrawingElement[]>([]);
  const [history, setHistory] = useState<DrawingElement[][]>([[]]);
  const [historyIndex, setHistoryIndex] = useState(0);
  const [isDrawing, setIsDrawing] = useState(false);
  const [currentPath, setCurrentPath] = useState<Point[]>([]);
  const [selectedElement, setSelectedElement] = useState<string | null>(null);
  const [tool, setTool] = useState<Tool>('pen');
  const [color, setColor] = useState('#FFD700');
  const [fontSize, setFontSize] = useState(24);
  const [strokeWidth, setStrokeWidth] = useState(4);
  const [fontWeight, setFontWeight] = useState<'normal' | 'bold'>('normal');
  const [fontStyle, setFontStyle] = useState<'normal' | 'italic'>('normal');
  const [showColorPicker, setShowColorPicker] = useState(false);

  const [showExport, setShowExport] = useState(false);
  const [textEditId, setTextEditId] = useState<string | null>(null);
  const [textEditValue, setTextEditValue] = useState('');
  const [textEditPos, setTextEditPos] = useState<Point | null>(null);
  const [dragStart, setDragStart] = useState<Point | null>(null);
  const [smartShapeEnabled, setSmartShapeEnabled] = useState(true);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);

  // Pause video when whiteboard opens
  useEffect(() => {
    if (whiteboardActive) {
      setIsPlaying(false);
    }
  }, [whiteboardActive, setIsPlaying]);

  // Load saved state for current timestamp
  useEffect(() => {
    if (!whiteboardActive) return;
    const saved = whiteboardSavedStates.find(s => Math.abs(s.timestamp - currentTime) < 5);
    if (saved && saved.elements) {
      setElements(saved.elements as DrawingElement[]);
      setHistory([saved.elements as DrawingElement[]]);
      setHistoryIndex(0);
      setHasUnsavedChanges(false);
    } else {
      setElements([]);
      setHistory([[]]);
      setHistoryIndex(0);
    }
  }, [whiteboardActive, currentTime, whiteboardSavedStates]);

  // Resize canvas
  useEffect(() => {
    if (!whiteboardActive) return;
    const resize = () => {
      const canvas = canvasRef.current;
      const container = containerRef.current;
      if (!canvas || !container) return;
      canvas.width = container.clientWidth;
      canvas.height = container.clientHeight;
      redrawCanvas();
    };
    resize();
    window.addEventListener('resize', resize);
    return () => window.removeEventListener('resize', resize);
  }, [whiteboardActive]);

  const redrawCanvas = useCallback(() => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext('2d');
    if (!canvas || !ctx) return;

    ctx.clearRect(0, 0, canvas.width, canvas.height);

    elements.forEach((el) => {
      ctx.save();
      
      if (el.type === 'drawing' && el.points && el.points.length > 1) {
        ctx.strokeStyle = el.color;
        ctx.lineWidth = el.strokeWidth || 4;
        ctx.lineCap = 'round';
        ctx.lineJoin = 'round';
        ctx.beginPath();
        ctx.moveTo(el.points[0].x, el.points[0].y);
        el.points.forEach((p, i) => {
          if (i > 0) ctx.lineTo(p.x, p.y);
        });
        ctx.stroke();
      } else if (el.type === 'highlight' && el.points && el.points.length > 1) {
        ctx.strokeStyle = el.color;
        ctx.lineWidth = el.strokeWidth || 24;
        ctx.lineCap = 'round';
        ctx.lineJoin = 'round';
        ctx.globalAlpha = 0.35;
        ctx.beginPath();
        ctx.moveTo(el.points[0].x, el.points[0].y);
        el.points.forEach((p, i) => {
          if (i > 0) ctx.lineTo(p.x, p.y);
        });
        ctx.stroke();
      } else if (el.type === 'text') {
        ctx.fillStyle = el.color;
        const weight = el.fontWeight === 'bold' ? 'bold' : 'normal';
        const style = el.fontStyle === 'italic' ? 'italic' : 'normal';
        ctx.font = `${style} ${weight} ${el.fontSize || 24}px sans-serif`;
        const lines = (el.content || '').split('\n');
        lines.forEach((line, i) => {
          ctx.fillText(line, el.x, el.y + i * (el.fontSize || 24) * 1.2);
        });
        if (el.textDecoration === 'underline') {
          lines.forEach((line, i) => {
            const metrics = ctx.measureText(line);
            ctx.beginPath();
            ctx.strokeStyle = el.color;
            ctx.lineWidth = 2;
            const y = el.y + i * (el.fontSize || 24) * 1.2 + 4;
            ctx.moveTo(el.x, y);
            ctx.lineTo(el.x + metrics.width, y);
            ctx.stroke();
          });
        }
      } else if (el.type === 'arrow' && el.points && el.points.length >= 2) {
        const start = el.points[0];
        const end = el.points[el.points.length - 1];
        ctx.strokeStyle = el.color;
        ctx.lineWidth = el.strokeWidth || 3;
        ctx.beginPath();
        ctx.moveTo(start.x, start.y);
        ctx.lineTo(end.x, end.y);
        ctx.stroke();
        // Arrow head
        const angle = Math.atan2(end.y - start.y, end.x - start.x);
        const headLen = 15 + (el.strokeWidth || 3);
        ctx.beginPath();
        ctx.moveTo(end.x, end.y);
        ctx.lineTo(end.x - headLen * Math.cos(angle - Math.PI / 6), end.y - headLen * Math.sin(angle - Math.PI / 6));
        ctx.lineTo(end.x - headLen * Math.cos(angle + Math.PI / 6), end.y - headLen * Math.sin(angle + Math.PI / 6));
        ctx.closePath();
        ctx.fillStyle = el.color;
        ctx.fill();
      } else if (el.type === 'line') {
        ctx.strokeStyle = el.color;
        ctx.lineWidth = el.strokeWidth || 3;
        ctx.lineCap = 'round';
        ctx.beginPath();
        ctx.moveTo(el.x, el.y);
        ctx.lineTo(el.x + (el.width || 100), el.y + (el.height || 0));
        ctx.stroke();
      } else if (el.type === 'shape') {
        ctx.strokeStyle = el.color;
        ctx.lineWidth = el.strokeWidth || 3;
        if (el.shapeType === 'rect') {
          ctx.strokeRect(el.x, el.y, el.width || 100, el.height || 60);
        } else if (el.shapeType === 'circle') {
          ctx.beginPath();
          const rx = (el.width || 100) / 2;
          const ry = (el.height || 100) / 2;
          ctx.ellipse(el.x + rx, el.y + ry, rx, ry, 0, 0, Math.PI * 2);
          ctx.stroke();
        } else if (el.shapeType === 'triangle') {
          ctx.beginPath();
          const w = el.width || 100;
          const h = el.height || 86;
          ctx.moveTo(el.x + w / 2, el.y);
          ctx.lineTo(el.x + w, el.y + h);
          ctx.lineTo(el.x, el.y + h);
          ctx.closePath();
          ctx.stroke();
        }
      } else if (el.type === 'sticky') {
        // Shadow
        ctx.fillStyle = 'rgba(0,0,0,0.2)';
        ctx.fillRect(el.x + 4, el.y + 4, el.width || 180, el.height || 120);
        // Note
        ctx.fillStyle = '#FEF08A';
        ctx.fillRect(el.x, el.y, el.width || 180, el.height || 120);
        // Pin
        ctx.fillStyle = '#EF4444';
        ctx.beginPath();
        ctx.arc(el.x + (el.width || 180) / 2, el.y - 5, 8, 0, Math.PI * 2);
        ctx.fill();
        // Text
        ctx.fillStyle = '#1F2937';
        ctx.font = '14px sans-serif';
        const lines = (el.content || 'Click to edit...').split('\n');
        lines.slice(0, 6).forEach((line, i) => {
          ctx.fillText(line.slice(0, 25), el.x + 10, el.y + 24 + i * 18);
        });
      }
      
      ctx.restore();

      // Selection indicator
      if (selectedElement === el.id) {
        ctx.strokeStyle = '#3B82F6';
        ctx.lineWidth = 2;
        ctx.setLineDash([5, 5]);
        const bounds = getElementBounds(el);
        ctx.strokeRect(bounds.x - 5, bounds.y - 5, bounds.width + 10, bounds.height + 10);
        ctx.setLineDash([]);
      }
    });

    // Draw current path while drawing
    if (currentPath.length > 1) {
      ctx.strokeStyle = color;
      ctx.lineWidth = tool === 'highlight' ? 24 : strokeWidth;
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';
      if (tool === 'highlight') ctx.globalAlpha = 0.35;
      ctx.beginPath();
      ctx.moveTo(currentPath[0].x, currentPath[0].y);
      currentPath.forEach((p, i) => {
        if (i > 0) ctx.lineTo(p.x, p.y);
      });
      ctx.stroke();
    }

    // Draw shape preview
    if (dragStart && (tool === 'shape' || tool === 'arrow' || tool === 'line') && currentPath.length > 0) {
      const end = currentPath[currentPath.length - 1];
      ctx.strokeStyle = color;
      ctx.lineWidth = strokeWidth;
      ctx.setLineDash([5, 5]);
      if (tool === 'shape') {
        const w = end.x - dragStart.x;
        const h = end.y - dragStart.y;
        ctx.strokeRect(dragStart.x, dragStart.y, w, h);
      } else if (tool === 'arrow' || tool === 'line') {
        ctx.beginPath();
        ctx.moveTo(dragStart.x, dragStart.y);
        ctx.lineTo(end.x, end.y);
        ctx.stroke();
      }
      ctx.setLineDash([]);
    }
  }, [elements, currentPath, color, strokeWidth, tool, selectedElement, dragStart]);

  useEffect(() => {
    redrawCanvas();
  }, [redrawCanvas]);

  function getElementBounds(el: DrawingElement): { x: number; y: number; width: number; height: number } {
    if (el.points && el.points.length > 0) {
      return getBounds(el.points);
    }
    if (el.type === 'text') {
      return { x: el.x, y: el.y - (el.fontSize || 24), width: (el.content?.length || 5) * (el.fontSize || 24) * 0.6, height: (el.fontSize || 24) * 1.2 };
    }
    return { x: el.x, y: el.y, width: el.width || 100, height: el.height || 60 };
  }

  const addToHistory = (newElements: DrawingElement[]) => {
    const newHistory = history.slice(0, historyIndex + 1);
    newHistory.push([...newElements]);
    setHistory(newHistory);
    setHistoryIndex(newHistory.length - 1);
    setHasUnsavedChanges(true);
  };

  const undo = () => {
    if (historyIndex > 0) {
      setHistoryIndex(historyIndex - 1);
      setElements([...history[historyIndex - 1]]);
      setHasUnsavedChanges(true);
    }
  };

  const redo = () => {
    if (historyIndex < history.length - 1) {
      setHistoryIndex(historyIndex + 1);
      setElements([...history[historyIndex + 1]]);
      setHasUnsavedChanges(true);
    }
  };

  const getCanvasCoords = (e: React.MouseEvent | React.TouchEvent): Point => {
    const canvas = canvasRef.current;
    if (!canvas) return { x: 0, y: 0 };
    const rect = canvas.getBoundingClientRect();
    if ('touches' in e) {
      return {
        x: e.touches[0].clientX - rect.left,
        y: e.touches[0].clientY - rect.top,
      };
    }
    return {
      x: e.clientX - rect.left,
      y: e.clientY - rect.top,
    };
  };

  const handlePointerDown = (e: React.MouseEvent | React.TouchEvent) => {
    e.stopPropagation();
    e.preventDefault();
    const { x, y } = getCanvasCoords(e);

    if (tool === 'select') {
      const clicked = [...elements].reverse().find((el) => {
        const bounds = getElementBounds(el);
        return x >= bounds.x - 10 && x <= bounds.x + bounds.width + 10 &&
               y >= bounds.y - 10 && y <= bounds.y + bounds.height + 10;
      });
      setSelectedElement(clicked?.id || null);
      if (clicked?.type === 'text' || clicked?.type === 'sticky') {
        setTextEditId(clicked.id);
        setTextEditValue(clicked.content || '');
        setTextEditPos({ x: clicked.x, y: clicked.y });
      }
      return;
    }

    if (tool === 'eraser') {
      const toRemove = [...elements].reverse().find((el) => {
        const bounds = getElementBounds(el);
        return x >= bounds.x - 15 && x <= bounds.x + bounds.width + 15 &&
               y >= bounds.y - 15 && y <= bounds.y + bounds.height + 15;
      });
      if (toRemove) {
        const newElements = elements.filter(e => e.id !== toRemove.id);
        setElements(newElements);
        addToHistory(newElements);
      }
      return;
    }

    if (tool === 'text') {
      setTextEditId('new');
      setTextEditValue('');
      setTextEditPos({ x, y });
      return;
    }

    if (tool === 'sticky') {
      const id = `sticky-${Date.now()}`;
      const newElement: DrawingElement = {
        id,
        type: 'sticky',
        x,
        y,
        width: 180,
        height: 120,
        content: '',
        color: '#FEF08A',
      };
      const newElements = [...elements, newElement];
      setElements(newElements);
      addToHistory(newElements);
      setSelectedElement(id);
      setTextEditId(id);
      setTextEditValue('');
      setTextEditPos({ x: x + 10, y: y + 20 });
      return;
    }

    setIsDrawing(true);
    setDragStart({ x, y });
    setCurrentPath([{ x, y }]);
  };

  const handlePointerMove = (e: React.MouseEvent | React.TouchEvent) => {
    if (!isDrawing) return;
    e.stopPropagation();
    e.preventDefault();
    const { x, y } = getCanvasCoords(e);
    setCurrentPath((prev) => [...prev, { x, y }]);
  };

  const handlePointerUp = (e: React.MouseEvent | React.TouchEvent) => {
    e.stopPropagation();
    if (!isDrawing || currentPath.length < 2) {
      setIsDrawing(false);
      setCurrentPath([]);
      setDragStart(null);
      return;
    }

    const id = `${tool}-${Date.now()}`;
    let newElement: DrawingElement | null = null;

    if (tool === 'shape' && dragStart) {
      const end = currentPath[currentPath.length - 1];
      newElement = {
        id,
        type: 'shape',
        x: Math.min(dragStart.x, end.x),
        y: Math.min(dragStart.y, end.y),
        width: Math.abs(end.x - dragStart.x),
        height: Math.abs(end.y - dragStart.y),
        color,
        strokeWidth,
        shapeType: 'rect',
      };
    } else if (tool === 'arrow' && dragStart) {
      newElement = {
        id,
        type: 'arrow',
        x: dragStart.x,
        y: dragStart.y,
        points: [dragStart, currentPath[currentPath.length - 1]],
        color,
        strokeWidth,
      };
    } else if (tool === 'line' && dragStart) {
      const end = currentPath[currentPath.length - 1];
      newElement = {
        id,
        type: 'line',
        x: dragStart.x,
        y: dragStart.y,
        width: end.x - dragStart.x,
        height: end.y - dragStart.y,
        color,
        strokeWidth,
      };
    } else if (tool === 'pen' && smartShapeEnabled) {
      // Smart shape detection
      const detected = detectShape(currentPath);
      if (detected.type !== 'freeform') {
        const { bounds } = detected;
        if (detected.type === 'line') {
          const start = currentPath[0];
          const end = currentPath[currentPath.length - 1];
          newElement = {
            id,
            type: 'line',
            x: start.x,
            y: start.y,
            width: end.x - start.x,
            height: end.y - start.y,
            color,
            strokeWidth,
          };
        } else {
          newElement = {
            id,
            type: 'shape',
            x: bounds.x,
            y: bounds.y,
            width: bounds.width,
            height: bounds.height,
            color,
            strokeWidth,
            shapeType: detected.type as 'rect' | 'circle' | 'triangle',
          };
        }
      } else {
        newElement = {
          id,
          type: 'drawing',
          x: currentPath[0].x,
          y: currentPath[0].y,
          color,
          strokeWidth,
          points: [...currentPath],
        };
      }
    } else if (tool === 'pen' || tool === 'highlight') {
      newElement = {
        id,
        type: tool === 'highlight' ? 'highlight' : 'drawing',
        x: currentPath[0].x,
        y: currentPath[0].y,
        color,
        strokeWidth: tool === 'highlight' ? 24 : strokeWidth,
        points: [...currentPath],
      };
    }

    if (newElement) {
      const newElements = [...elements, newElement];
      setElements(newElements);
      addToHistory(newElements);
    }

    setIsDrawing(false);
    setCurrentPath([]);
    setDragStart(null);
  };

  const handleTextSubmit = () => {
    if (!textEditPos) {
      setTextEditId(null);
      return;
    }

    if (textEditId === 'new' && textEditValue.trim()) {
      const newElement: DrawingElement = {
        id: `text-${Date.now()}`,
        type: 'text',
        x: textEditPos.x,
        y: textEditPos.y,
        content: textEditValue,
        color,
        fontSize,
        fontWeight,
        fontStyle,
      };
      const newElements = [...elements, newElement];
      setElements(newElements);
      addToHistory(newElements);
    } else if (textEditId && textEditId !== 'new') {
      const newElements = elements.map(el =>
        el.id === textEditId ? { ...el, content: textEditValue } : el
      );
      setElements(newElements);
      addToHistory(newElements);
    }

    setTextEditId(null);
    setTextEditValue('');
    setTextEditPos(null);
  };

  const handleSave = () => {
    const canvas = canvasRef.current;
    const snapshot = canvas?.toDataURL('image/png');
    saveWhiteboardState(currentTime, snapshot);
    setHasUnsavedChanges(false);
  };

  const handleClear = () => {
    setElements([]);
    addToHistory([]);
    setSelectedElement(null);
  };

  const handleClose = () => {
    if (hasUnsavedChanges) {
      if (confirm('You have unsaved changes. Save before closing?')) {
        handleSave();
      }
    }
    setWhiteboardActive(false);
  };

  const handleExportHTML = () => {
    const states = whiteboardSavedStates;
    const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${lesson?.metadata.title || 'Video Lesson'} - Class Notes</title>
  <style>
    * { box-sizing: border-box; }
    body { font-family: system-ui, -apple-system, sans-serif; background: linear-gradient(135deg, #1a1a2e 0%, #16213e 100%); color: white; padding: 2rem; min-height: 100vh; margin: 0; }
    .container { max-width: 900px; margin: 0 auto; }
    h1 { color: #ffd700; text-align: center; font-size: 2.5rem; margin-bottom: 0.5rem; }
    .subtitle { text-align: center; color: #888; margin-bottom: 3rem; }
    .note { background: linear-gradient(135deg, #2d2d44 0%, #1f1f35 100%); border-radius: 1.5rem; padding: 1.5rem; margin: 2rem 0; border: 1px solid rgba(255,215,0,0.2); box-shadow: 0 10px 40px rgba(0,0,0,0.3); }
    .note img { width: 100%; border-radius: 1rem; margin-top: 1rem; border: 1px solid rgba(255,255,255,0.1); }
    .timestamp { color: #ffd700; font-size: 0.875rem; font-weight: bold; display: inline-flex; align-items: center; gap: 0.5rem; background: rgba(255,215,0,0.1); padding: 0.5rem 1rem; border-radius: 2rem; }
    .meta { text-align: center; color: #666; margin-bottom: 2rem; font-size: 0.9rem; }
    .footer { text-align: center; margin-top: 3rem; padding-top: 2rem; border-top: 1px solid rgba(255,255,255,0.1); color: #666; font-size: 0.8rem; }
  </style>
</head>
<body>
  <div class="container">
    <h1>📚 ${lesson?.metadata.title || 'Video Lesson'}</h1>
    <p class="subtitle">Interactive Class Notes</p>
    <p class="meta">Generated on ${new Date().toLocaleDateString()} • ${states.length} notes captured</p>
    ${states.map((s, i) => `
    <div class="note">
      <span class="timestamp">⏱️ ${Math.floor(s.timestamp / 60)}:${String(Math.floor(s.timestamp % 60)).padStart(2, '0')}</span>
      ${s.snapshot ? `<img src="${s.snapshot}" alt="Note ${i + 1}">` : '<p style="color:#888;text-align:center;padding:2rem;">(No screenshot captured)</p>'}
    </div>`).join('')}
    <div class="footer">Created with Video Lesson • videolesson.app</div>
  </div>
</body>
</html>`;

    const blob = new Blob([html], { type: 'text/html' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${lesson?.metadata.title || 'class-notes'}-${Date.now()}.html`;
    a.click();
    URL.revokeObjectURL(url);
    setShowExport(false);
  };

  const deleteSelected = () => {
    if (selectedElement) {
      const newElements = elements.filter(e => e.id !== selectedElement);
      setElements(newElements);
      addToHistory(newElements);
      setSelectedElement(null);
    }
  };

  // Keyboard shortcuts
  useEffect(() => {
    if (!whiteboardActive) return;
    const handleKey = (e: KeyboardEvent) => {
      if (textEditId) return; // Don't handle shortcuts while editing text
      
      if (e.key === 'Delete' || e.key === 'Backspace') {
        deleteSelected();
      } else if (e.key === 'z' && (e.ctrlKey || e.metaKey)) {
        e.preventDefault();
        if (e.shiftKey) redo();
        else undo();
      } else if (e.key === 'y' && (e.ctrlKey || e.metaKey)) {
        e.preventDefault();
        redo();
      } else if (e.key === 'Escape') {
        setSelectedElement(null);
        setTextEditId(null);
      }
    };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [whiteboardActive, selectedElement, textEditId, historyIndex, history]);

  if (!whiteboardActive) {
    return (
      <button
        onClick={() => setWhiteboardActive(true)}
        className="absolute top-3 right-3 z-20 px-4 py-2.5 bg-gray-900/90 hover:bg-gray-800 border border-yellow-500/30 rounded-xl text-sm font-bold text-white transition-all flex items-center gap-2 shadow-lg hover:shadow-xl hover:border-yellow-500/50"
      >
        <span className="text-lg">✏️</span>
        <span>Whiteboard</span>
      </button>
    );
  }

  return (
    <div
      ref={containerRef}
      className="absolute inset-0 z-30"
      style={{ background: 'rgba(255,255,255,0.85)' }}
      onClick={(e) => e.stopPropagation()}
    >
      {/* Canvas */}
      <canvas
        ref={canvasRef}
        className={`absolute inset-0 ${tool === 'select' ? 'cursor-default' : tool === 'eraser' ? 'cursor-cell' : tool === 'text' ? 'cursor-text' : 'cursor-crosshair'}`}
        onMouseDown={handlePointerDown}
        onMouseMove={handlePointerMove}
        onMouseUp={handlePointerUp}
        onMouseLeave={handlePointerUp}
        onTouchStart={handlePointerDown}
        onTouchMove={handlePointerMove}
        onTouchEnd={handlePointerUp}
      />

      {/* Text input overlay */}
      <AnimatePresence>
        {textEditId && textEditPos && (
          <motion.div
            className="absolute z-50"
            style={{ left: textEditPos.x, top: textEditPos.y - 10 }}
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0 }}
          >
            <div className="bg-gray-900 rounded-xl shadow-2xl border border-gray-700 overflow-hidden">
              {/* Text format toolbar */}
              <div className="flex items-center gap-1 px-2 py-1.5 border-b border-gray-700 bg-gray-800">
                <select
                  value={fontSize}
                  onChange={e => setFontSize(Number(e.target.value))}
                  className="bg-gray-700 text-white text-xs rounded px-1 py-0.5 outline-none"
                >
                  {FONT_SIZES.map(s => <option key={s} value={s}>{s}px</option>)}
                </select>
                <button
                  onClick={() => setFontWeight(fontWeight === 'bold' ? 'normal' : 'bold')}
                  className={`w-7 h-7 rounded text-sm font-bold ${fontWeight === 'bold' ? 'bg-yellow-500 text-black' : 'bg-gray-700 text-white'}`}
                >
                  B
                </button>
                <button
                  onClick={() => setFontStyle(fontStyle === 'italic' ? 'normal' : 'italic')}
                  className={`w-7 h-7 rounded text-sm italic ${fontStyle === 'italic' ? 'bg-yellow-500 text-black' : 'bg-gray-700 text-white'}`}
                >
                  I
                </button>
                <div className="w-px h-5 bg-gray-600 mx-1" />
                {COLORS.slice(0, 6).map(c => (
                  <button
                    key={c}
                    onClick={() => setColor(c)}
                    className={`w-5 h-5 rounded-full border ${color === c ? 'border-white scale-110' : 'border-gray-600'}`}
                    style={{ background: c }}
                  />
                ))}
              </div>
              <textarea
                value={textEditValue}
                onChange={(e) => setTextEditValue(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Escape') {
                    setTextEditId(null);
                    setTextEditValue('');
                    setTextEditPos(null);
                  }
                }}
                onBlur={handleTextSubmit}
                autoFocus
                placeholder="Type here..."
                className="bg-gray-900 text-white px-3 py-2 outline-none min-w-48 min-h-16 resize"
                style={{ 
                  color, 
                  fontSize: `${fontSize}px`,
                  fontWeight,
                  fontStyle,
                }}
              />
              <div className="flex justify-end gap-2 px-2 py-1.5 bg-gray-800 border-t border-gray-700">
                <button
                  onClick={() => { setTextEditId(null); setTextEditValue(''); setTextEditPos(null); }}
                  className="px-3 py-1 text-xs text-gray-400 hover:text-white rounded"
                >
                  Cancel
                </button>
                <button
                  onClick={handleTextSubmit}
                  className="px-3 py-1 text-xs bg-yellow-500 text-black rounded font-bold"
                >
                  Add
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Main Toolbar */}
      <motion.div
        className="absolute top-3 left-1/2 -translate-x-1/2 flex items-center gap-1 bg-gray-900/95 backdrop-blur-sm rounded-2xl px-3 py-2 border border-gray-700 shadow-2xl z-50"
        initial={{ y: -20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
      >
        {/* Tools */}
        <div className="flex items-center gap-1">
          {[
            { id: 'select', icon: '👆', label: 'Select' },
            { id: 'pen', icon: '✏️', label: 'Draw' },
            { id: 'text', icon: 'T', label: 'Text', isText: true },
            { id: 'highlight', icon: '🖍️', label: 'Highlight' },
            { id: 'arrow', icon: '➡️', label: 'Arrow' },
            { id: 'line', icon: '📏', label: 'Line' },
            { id: 'shape', icon: '⬜', label: 'Rectangle' },
            { id: 'sticky', icon: '📌', label: 'Sticky Note' },
            { id: 'eraser', icon: '🧹', label: 'Eraser' },
          ].map((t) => (
            <button
              key={t.id}
              onClick={() => setTool(t.id as Tool)}
              className={`w-9 h-9 rounded-xl flex items-center justify-center transition-all ${
                tool === t.id
                  ? 'bg-yellow-500 text-black scale-110 shadow-lg'
                  : 'bg-gray-800 hover:bg-gray-700 text-white'
              } ${t.isText ? 'font-bold text-lg' : 'text-lg'}`}
              title={t.label}
            >
              {t.icon}
            </button>
          ))}
        </div>

        <div className="w-px h-8 bg-gray-700 mx-2" />

        {/* Color picker */}
        <div className="relative">
          <button
            onClick={() => { setShowColorPicker(!showColorPicker); }}
            className="w-9 h-9 rounded-xl border-2 border-gray-600 transition-all hover:scale-105 hover:border-gray-400"
            style={{ background: color }}
            title="Color"
          />
          <AnimatePresence>
            {showColorPicker && (
              <motion.div
                className="absolute top-full mt-2 left-0 bg-gray-900 border border-gray-700 rounded-xl p-3 z-50 shadow-2xl"
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
              >
                <div className="grid grid-cols-4 gap-2 mb-3">
                  {COLORS.map((c) => (
                    <button
                      key={c}
                      onClick={() => { setColor(c); setShowColorPicker(false); }}
                      className={`w-8 h-8 rounded-lg border-2 transition-transform hover:scale-110 ${color === c ? 'border-white' : 'border-transparent'}`}
                      style={{ background: c }}
                    />
                  ))}
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-xs text-gray-400">Custom:</span>
                  <input
                    type="color"
                    value={color}
                    onChange={e => setColor(e.target.value)}
                    className="w-8 h-8 rounded cursor-pointer"
                  />
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Stroke width */}
        <div className="relative">
          <select
            value={strokeWidth}
            onChange={e => setStrokeWidth(Number(e.target.value))}
            className="bg-gray-800 text-white text-xs rounded-lg px-2 py-2 outline-none border border-gray-700 cursor-pointer"
            title="Stroke Width"
          >
            {STROKE_WIDTHS.map(w => (
              <option key={w} value={w}>{w}px</option>
            ))}
          </select>
        </div>

        <div className="w-px h-8 bg-gray-700 mx-2" />

        {/* Smart shape toggle */}
        <button
          onClick={() => setSmartShapeEnabled(!smartShapeEnabled)}
          className={`px-2 py-1.5 rounded-lg text-xs font-bold transition-all ${smartShapeEnabled ? 'bg-purple-500/20 text-purple-400 border border-purple-500/50' : 'bg-gray-800 text-gray-400'}`}
          title="Smart Shape Detection"
        >
          🔮 Smart
        </button>

        <div className="w-px h-8 bg-gray-700 mx-2" />

        {/* Undo/Redo */}
        <button
          onClick={undo}
          disabled={historyIndex <= 0}
          className="w-8 h-8 rounded-lg bg-gray-800 hover:bg-gray-700 disabled:opacity-30 disabled:cursor-not-allowed flex items-center justify-center text-sm"
          title="Undo (Ctrl+Z)"
        >
          ↩️
        </button>
        <button
          onClick={redo}
          disabled={historyIndex >= history.length - 1}
          className="w-8 h-8 rounded-lg bg-gray-800 hover:bg-gray-700 disabled:opacity-30 disabled:cursor-not-allowed flex items-center justify-center text-sm"
          title="Redo (Ctrl+Y)"
        >
          ↪️
        </button>

        <div className="w-px h-8 bg-gray-700 mx-2" />

        {/* Actions */}
        <button
          onClick={handleClear}
          className="px-3 py-1.5 bg-red-500/20 hover:bg-red-500/30 text-red-400 rounded-lg text-xs font-bold transition-colors"
          title="Clear All"
        >
          Clear
        </button>
        <button
          onClick={handleSave}
          className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-colors flex items-center gap-1 ${hasUnsavedChanges ? 'bg-green-500 text-black animate-pulse' : 'bg-green-500/20 text-green-400 hover:bg-green-500/30'}`}
          title="Save to this scene"
        >
          💾 Save
        </button>
        <button
          onClick={() => setShowExport(true)}
          className="px-3 py-1.5 bg-blue-500/20 hover:bg-blue-500/30 text-blue-400 rounded-lg text-xs font-bold transition-colors"
          title="Export as HTML"
        >
          📤 Export
        </button>
        <button
          onClick={handleClose}
          className="w-9 h-9 rounded-xl bg-gray-800 hover:bg-gray-700 text-white flex items-center justify-center text-lg ml-1"
          title="Close Whiteboard"
        >
          ✕
        </button>
      </motion.div>

      {/* Bottom info bar */}
      <div className="absolute bottom-3 left-3 right-3 flex items-center justify-between">
        <div className="bg-gray-900/90 rounded-xl px-4 py-2 text-xs text-gray-400 border border-gray-700 flex items-center gap-3">
          <span>📍 Scene: {Math.floor(currentTime / 60)}:{String(Math.floor(currentTime % 60)).padStart(2, '0')}</span>
          <span>|</span>
          <span>📝 {whiteboardSavedStates.length} note(s) saved</span>
          {hasUnsavedChanges && <span className="text-yellow-400 font-bold">• Unsaved changes</span>}
        </div>
        {selectedElement && (
          <div className="bg-gray-900/90 rounded-xl px-4 py-2 text-xs border border-gray-700 flex items-center gap-2">
            <span className="text-gray-400">Selected:</span>
            <button
              onClick={deleteSelected}
              className="px-2 py-1 bg-red-500/20 text-red-400 rounded hover:bg-red-500/30 font-bold"
            >
              🗑️ Delete
            </button>
          </div>
        )}
      </div>

      {/* Export modal */}
      <AnimatePresence>
        {showExport && (
          <motion.div
            className="absolute inset-0 bg-black/70 flex items-center justify-center z-50"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setShowExport(false)}
          >
            <motion.div
              className="bg-gray-900 border border-yellow-500/30 rounded-3xl p-8 max-w-md text-center shadow-2xl"
              initial={{ scale: 0.9, y: 20 }}
              animate={{ scale: 1, y: 0 }}
              onClick={(e) => e.stopPropagation()}
            >
              <div className="text-6xl mb-4">📤</div>
              <h3 className="text-2xl font-black text-white mb-2">Export Class Notes</h3>
              <p className="text-gray-400 text-sm mb-6 leading-relaxed">
                Download all {whiteboardSavedStates.length} saved whiteboard snapshots as a beautifully formatted HTML document. 
                Perfect for reviewing, sharing, or printing!
              </p>
              <div className="flex gap-3">
                <button
                  onClick={() => setShowExport(false)}
                  className="flex-1 py-3 rounded-xl bg-gray-800 text-gray-300 font-bold hover:bg-gray-700 transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={handleExportHTML}
                  className="flex-1 py-3 rounded-xl font-bold transition-colors text-black"
                  style={{ background: 'linear-gradient(135deg, #ffd700, #ff6b35)' }}
                >
                  Download HTML
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};
