// AskEva logo with a fallback to the full-size file
import IMAGES from '../../assets/image';

export default function Logo({ className, style }) {
  return (
    <img
      className={className}
      style={style}
      src={IMAGES.logo}
      alt="AskEva"
      onError={(e) => {
        if (!e.currentTarget.dataset.tried) {
          e.currentTarget.dataset.tried = '1';
          e.currentTarget.src = IMAGES.logoFull;
        }
      }}
    />
  );
}
