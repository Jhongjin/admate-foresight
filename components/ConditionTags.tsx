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
    <div className="flex max-w-full flex-wrap gap-2">
      {tags.map((tag) => (
        <span
          key={tag.label}
          className="inline-flex max-w-full min-w-0 items-start gap-1.5 rounded-md border border-teal-100 bg-teal-50 px-2.5 py-1 text-xs font-medium text-teal-800"
        >
          <span className="shrink-0 text-teal-500">{tag.label}</span>
          <span className="min-w-0 break-words text-slate-700">{tag.value}</span>
        </span>
      ))}
    </div>
  );
}
