'use client';

interface Tag {
  label: string;
  value: string;
}

interface ConditionTagsProps {
  tags: Tag[];
}

export default function ConditionTags({ tags }: ConditionTagsProps) {
  return (
    <div className="flex flex-wrap gap-2">
      {tags.map((tag) => (
        <span
          key={tag.label}
          className="inline-flex items-center gap-1 px-3 py-1 bg-indigo-50 text-indigo-700 rounded-full text-xs font-medium"
        >
          <span className="text-indigo-400">{tag.label}</span>
          <span>{tag.value}</span>
        </span>
      ))}
    </div>
  );
}
