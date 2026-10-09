import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import JSZip from 'jszip';

interface LibraryItem {
  id: string;
  learnerId: string;
  learnerName: string;
  type: string;
  title: string;
  timestamp: string;
  html: string; // URL to the saved HTML file
  shareId: string;
}

const ContentLibraryPage: React.FC = () => {
  const [items, setItems] = useState<LibraryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  const fetchContent = async () => {
    try {
      const res = await fetch('/api/content');
      if (res.ok) {
        const data = await res.json();
        // Sort by newest
        data.sort((a: LibraryItem, b: LibraryItem) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
        setItems(data);
      }
    } catch (e) {
      console.error("Failed to fetch library content", e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchContent();
  }, []);

  const handleDelete = async (itemId: string) => {
    if (!confirm("Are you sure you want to delete this content?")) return;
    
    try {
      const res = await fetch(`/api/content/${itemId}`, { method: 'DELETE' });
      if (res.ok) {
        setItems(prev => prev.filter(item => item.id !== itemId));
      } else {
        alert("Failed to delete content.");
      }
    } catch (e) {
      console.error("Error deleting content", e);
      alert("Error deleting content.");
    }
  };

  const handleOpenLive = (item: LibraryItem) => {
    if (item.shareId) {
      navigate(`/live/${item.shareId}`);
    } else {
      alert("This content cannot be launched in a live session.");
    }
  };

  const handleViewStatic = (item: LibraryItem) => {
    window.open(item.html, '_blank');
  };

  const handleDownloadForHost = async () => {
    if (items.length === 0) {
        alert("No content to download.");
        return;
    }

    const zip = new JSZip();
    const learnersFolder = zip.folder("Learners");

    if (!learnersFolder) return;

    let count = 0;

    for (const item of items) {
        const safeLearnerName = item.learnerName.replace(/[^a-z0-9]/gi, '_').trim();
        const safeTitle = item.title.replace(/[^a-z0-9]/gi, '_').trim();
        const fileName = `${safeTitle}.html`;
        
        try {
            // Fetch the HTML content from the URL
            const res = await fetch(item.html);
            if (res.ok) {
                const html = await res.text();
                const learnerFolder = learnersFolder.folder(safeLearnerName);
                if (learnerFolder) {
                    learnerFolder.file(fileName, html);
                    count++;
                }
            }
        } catch (e) {
            console.error(`Failed to fetch HTML for ${item.title}`, e);
        }
    }

    if (count === 0) {
        alert("No HTML-ready content found to zip.");
        return;
    }

    const content = await zip.generateAsync({ type: "blob" });
    const url = URL.createObjectURL(content);
    const a = document.createElement("a");
    a.href = url;
    a.download = "Tutor_Content_Library_Host.zip";
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const handleCopyPath = (item: LibraryItem) => {
      // The URL is already the path relative to the root
      const path = item.html;
      navigator.clipboard.writeText(path);
      alert(`Path copied: ${path}\n\nYou can share this link directly with your student.`);
  };

  // Group by Learner
  const grouped: Record<string, LibraryItem[]> = items.reduce((acc, curr) => {
    const key = curr.learnerName || "Unassigned";
    if (!acc[key]) acc[key] = [];
    acc[key].push(curr);
    return acc;
  }, {} as Record<string, LibraryItem[]>);

  return (
    <div className="max-w-6xl mx-auto p-6">
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Content Library</h1>
          <p className="text-gray-600">Manage and export your saved interactive lessons.</p>
        </div>
        <div className="flex gap-2">
            <Button onClick={handleDownloadForHost} className="bg-green-600 hover:bg-green-700">
                <i className="fas fa-file-archive mr-2"></i> Download for Host (ZIP)
            </Button>
            <Button variant="secondary" onClick={() => navigate('/dashboard')}>
                Back to Dashboard
            </Button>
        </div>
      </div>

      {loading ? (
        <div className="text-center py-10">Loading library...</div>
      ) : items.length === 0 ? (
        <div className="text-center py-20 bg-white rounded-xl border border-dashed border-gray-300">
          <div className="text-6xl mb-4">📂</div>
          <h3 className="text-xl font-bold text-gray-700">Library is Empty</h3>
          <p className="text-gray-500 mt-2">Generate and save content to see it here.</p>
          <Button className="mt-6" onClick={() => navigate('/dashboard')}>Go to Dashboard</Button>
        </div>
      ) : (
        <div className="space-y-8">
          {Object.entries(grouped).map(([learner, learnerItems]) => (
            <div key={learner} className="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
              <h2 className="text-xl font-bold text-gray-800 mb-4 flex items-center gap-2">
                <span className="w-2 h-8 bg-indigo-500 rounded-full"></span>
                {learner}
                <span className="text-sm font-normal text-gray-500 ml-2">({learnerItems.length} items)</span>
              </h2>
              
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {learnerItems.map((item, idx) => (
                  <Card key={`${item.id || item.title}-${idx}`} className="flex flex-col h-full hover:shadow-md transition-shadow">
                    <div className="p-4 flex-1">
                      <div className="flex justify-between items-start mb-2">
                        <span className="px-2 py-1 bg-indigo-50 text-indigo-700 text-xs font-bold rounded uppercase">
                          {item.type}
                        </span>
                        <span className="text-xs text-gray-400">
                          {new Date(item.timestamp).toLocaleDateString()}
                        </span>
                      </div>
                      <h3 className="font-bold text-gray-900 mb-2 line-clamp-2" title={item.title}>
                        {item.title}
                      </h3>
                    </div>
                    <div className="p-4 bg-gray-50 border-t border-gray-100 flex justify-between items-center gap-2">
                      <Button 
                        variant="primary" 
                        className="flex-1 text-xs"
                        onClick={() => handleOpenLive(item)}
                      >
                        <i className="fas fa-chalkboard-teacher mr-1"></i> Live
                      </Button>
                      <Button 
                        variant="secondary" 
                        className="p-2 text-xs"
                        onClick={() => handleViewStatic(item)}
                        title="View Static HTML"
                      >
                        <i className="fas fa-file-code"></i>
                      </Button>
                      <button 
                        className="p-2 text-gray-500 hover:text-indigo-600 hover:bg-indigo-50 rounded transition-colors"
                        title="Copy Link"
                        onClick={() => handleCopyPath(item)}
                      >
                        <i className="fas fa-link"></i>
                      </button>
                      <button 
                        className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded transition-colors"
                        title="Delete"
                        onClick={() => handleDelete(item.id)}
                      >
                        <i className="fas fa-trash"></i>
                      </button>
                    </div>
                  </Card>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default ContentLibraryPage;
