interface Props {
  title: string;
}

export function PlaceholderStep({ title }: Props) {
  return (
    <div className="p-6">
      <h2 className="text-xl font-semibold text-gray-800">{title}</h2>
      <p className="mt-2 text-gray-500">Этот шаг будет реализован позже.</p>
    </div>
  );
}
