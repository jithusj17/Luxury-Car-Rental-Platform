/** Dashboard page title row ("Dashboard", "My listing", … in the Figma frames). */
export function PageHeader({ title, description, actions }: { title: string; description?: string; actions?: React.ReactNode }) {
  return (
    <div className="mb-8 flex flex-wrap items-end justify-between gap-4">
      <div>
        <h1 className="text-h2 font-semibold sm:text-h1">{title}</h1>
        {description && <p className="mt-2 text-base">{description}</p>}
      </div>
      {actions && <div className="flex gap-3">{actions}</div>}
    </div>
  );
}
