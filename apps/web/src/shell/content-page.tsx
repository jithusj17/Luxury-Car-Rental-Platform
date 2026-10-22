/** Shared frame for simple content pages (About, FAQ, Contact, Terms): dark title band + body. */
export function ContentPage({ title, intro, children }: { title: string; intro?: string; children: React.ReactNode }) {
  return (
    <>
      <section className="bg-heading">
        <div className="container-site flex flex-col gap-3 py-14 lg:py-20">
          <h1 className="text-h1 font-semibold text-white lg:text-display">{title}</h1>
          {intro && <p className="max-w-2xl text-base text-white/70">{intro}</p>}
        </div>
      </section>
      <div className="container-site py-12 lg:py-20">{children}</div>
    </>
  );
}
