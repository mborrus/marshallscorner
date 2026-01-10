// Placeholder component for missing content
// Displays a visible [TODO: ...] message

interface PlaceholderProps {
  message: string;
}

export default function Placeholder({ message }: PlaceholderProps) {
  return <span className="placeholder">[TODO: {message}]</span>;
}
