
import React from 'react';

interface StarRatingProps {
  rating: number;
}

const StarRating: React.FC<StarRatingProps> = ({ rating }) => {
  return (
    <div className="flex items-center">
      {[...Array(5)].map((_, index) => {
        const starClass = index < rating ? 'text-brand-yellow' : 'text-brand-gray-light';
        return (
          <svg key={index} className={`w-5 h-5 fill-current ${starClass}`} viewBox="0 0 20 20">
            <path d="M10 15l-5.878 3.09 1.123-6.545L.489 6.91l6.572-.955L10 0l2.939 5.955 6.572.955-4.756 4.635 1.123 6.545z"/>
          </svg>
        );
      })}
    </div>
  );
};

export default StarRating;
