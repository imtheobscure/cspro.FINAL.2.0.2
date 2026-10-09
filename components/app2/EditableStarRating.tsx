import React, { useState } from 'react';

interface EditableStarRatingProps {
  rating: number;
  onRatingChange: (rating: number) => void;
}

const EditableStarRating: React.FC<EditableStarRatingProps> = ({ rating, onRatingChange }) => {
  const [hoverRating, setHoverRating] = useState(0);

  return (
    <div className="flex items-center">
      {[...Array(5)].map((_, index) => {
        const starValue = index + 1;
        const isFilled = starValue <= (hoverRating || rating);
        
        return (
          <svg
            key={index}
            className={`w-6 h-6 fill-current cursor-pointer transition-colors ${isFilled ? 'text-brand-yellow' : 'text-brand-gray-light'}`}
            viewBox="0 0 20 20"
            onClick={() => onRatingChange(starValue)}
            onMouseEnter={() => setHoverRating(starValue)}
            onMouseLeave={() => setHoverRating(0)}
          >
            <path d="M10 15l-5.878 3.09 1.123-6.545L.489 6.91l6.572-.955L10 0l2.939 5.955 6.572.955-4.756 4.635 1.123 6.545z" />
          </svg>
        );
      })}
    </div>
  );
};

export default EditableStarRating;
