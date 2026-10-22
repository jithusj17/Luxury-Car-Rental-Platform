import { Plus, Search } from "lucide-react";
import { Badge, StatusBadge } from "@/shared/components/ui/badge";
import { Button } from "@/shared/components/ui/button";
import { Card, CardHeader, CardTitle } from "@/shared/components/ui/card";
import { Checkbox, Radio, RadioGroup } from "@/shared/components/ui/checkbox";
import { Dialog, DialogContent, DialogDescription, DialogTitle, DialogTrigger } from "@/shared/components/ui/dialog";
import { EmptyState, Skeleton } from "@/shared/components/ui/feedback";
import { Field } from "@/shared/components/ui/field";
import { Input, Textarea } from "@/shared/components/ui/input";
import { Pagination } from "@/shared/components/ui/pagination";
import { Rating } from "@/shared/components/ui/rating";
import { Select } from "@/shared/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/shared/components/ui/tabs";
import { VehicleCard } from "@/domains/vehicles/components/vehicle-card";
import { VehicleImage } from "@/domains/vehicles/components/vehicle-image";
import { sampleVehicle } from "@/domains/vehicles/fixtures";

export const metadata = { title: "Style guide", robots: { index: false } };

const colors = [
  ["primary", "bg-primary"],
  ["primary-soft", "bg-primary-soft"],
  ["heading", "bg-heading"],
  ["body", "bg-body"],
  ["icon", "bg-icon"],
  ["border", "bg-border"],
  ["border-strong", "bg-border-strong"],
  ["surface", "bg-surface"],
  ["placeholder", "bg-placeholder"],
  ["success", "bg-success"],
  ["danger", "bg-danger"],
  ["info", "bg-info"],
] as const;

const typeScale = [
  ["Display · Outfit 70", "text-display font-semibold"],
  ["H1 · Outfit 40", "text-h1 font-semibold"],
  ["H2 · Outfit 30", "text-h2 font-medium"],
  ["H3 · Outfit 24", "text-h3 font-medium"],
  ["H4 · Outfit 20", "text-h4 font-medium"],
  ["H5 · Outfit 18", "text-h5 font-medium"],
] as const;

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>{title}</CardTitle>
      </CardHeader>
      {children}
    </Card>
  );
}

export default function StyleguidePage() {
  return (
    <div className="container-site flex flex-col gap-8 py-12">
      <h1 className="text-h1 font-semibold">Style guide</h1>

      <Section title="Colors">
        <ul className="grid grid-cols-2 gap-4 sm:grid-cols-4 lg:grid-cols-6">
          {colors.map(([name, bg]) => (
            <li key={name} className="flex flex-col gap-2">
              <span className={`h-16 rounded-md border border-border ${bg}`} />
              <span className="font-heading text-sm text-heading">{name}</span>
            </li>
          ))}
        </ul>
      </Section>

      <Section title="Typography">
        <div className="flex flex-col gap-4 overflow-hidden">
          {typeScale.map(([label, cls]) => (
            <p key={label} className={`font-heading text-heading ${cls}`}>
              {label}
            </p>
          ))}
          <p className="font-heading text-base">Body Title · Outfit 16 / 14</p>
          <p className="text-base">Body Text Large · Inter 16 — The quick brown fox jumps over the lazy dog.</p>
          <p>Body Text Medium · Inter 14 — The quick brown fox jumps over the lazy dog.</p>
          <p className="text-xs">Body Text Small · Inter 12 — The quick brown fox jumps over the lazy dog.</p>
        </div>
      </Section>

      <Section title="Buttons">
        <div className="flex flex-wrap items-center gap-3">
          <Button>Primary</Button>
          <Button variant="dark">Dark</Button>
          <Button variant="outline-primary">
            <Plus aria-hidden />
            List your car
          </Button>
          <Button variant="secondary">Secondary</Button>
          <Button variant="outline" size="sm">
            View car
          </Button>
          <Button variant="ghost">Ghost</Button>
          <Button variant="link">Link</Button>
          <Button disabled>Disabled</Button>
          <Button variant="secondary" shape="pill">
            Google
          </Button>
          <Button variant="secondary" size="icon" aria-label="Search">
            <Search />
          </Button>
        </div>
      </Section>

      <Section title="Badges & rating">
        <div className="flex flex-wrap items-center gap-3">
          <Badge>Featured</Badge>
          <Badge variant="soft">Soft</Badge>
          <StatusBadge status="pending" />
          <StatusBadge status="confirmed" />
          <StatusBadge status="active" />
          <StatusBadge status="completed" />
          <StatusBadge status="cancelled" />
          <Rating value={4} />
        </div>
      </Section>

      <Section title="Form controls">
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
          <Field label="Title" htmlFor="sg-title" required>
            <Input id="sg-title" placeholder="Title" />
          </Field>
          <Field label="Search" htmlFor="sg-search">
            <Input id="sg-search" placeholder="Search…" icon={<Search />} />
          </Field>
          <Field label="Transmission" htmlFor="sg-transmission">
            <Select
              id="sg-transmission"
              options={[
                { value: "automatic", label: "Automatic" },
                { value: "manual", label: "Manual" },
              ]}
            />
          </Field>
          <Field label="Daily rate" htmlFor="sg-rate" error="Enter a price above $0">
            <Input id="sg-rate" placeholder="Your price" aria-invalid aria-describedby="sg-rate-message" />
          </Field>
          <Field label="Description" htmlFor="sg-description" className="sm:col-span-2">
            <Textarea id="sg-description" placeholder="Your description" />
          </Field>
          <div className="flex flex-col gap-4">
            <label className="flex items-center gap-2 text-heading">
              <Checkbox defaultChecked /> GPS navigation
            </label>
            <label className="flex items-center gap-2 text-heading">
              <Checkbox /> Child seat
            </label>
          </div>
          <RadioGroup defaultValue="instant" aria-label="Booking mode" className="flex flex-col gap-4">
            <label className="flex items-center gap-2 text-heading">
              <Radio value="instant" /> Instant booking
            </label>
            <label className="flex items-center gap-2 text-heading">
              <Radio value="request" /> Request to book
            </label>
          </RadioGroup>
        </div>
      </Section>

      <Section title="Tabs, pagination & dialog">
        <div className="flex flex-col gap-6">
          <Tabs defaultValue="overview">
            <TabsList>
              <TabsTrigger value="overview">Overview</TabsTrigger>
              <TabsTrigger value="specs">Specs & features</TabsTrigger>
              <TabsTrigger value="reviews">Reviews</TabsTrigger>
            </TabsList>
            <TabsContent value="overview" className="pt-4">
              Overview content
            </TabsContent>
            <TabsContent value="specs" className="pt-4">
              Specs content
            </TabsContent>
            <TabsContent value="reviews" className="pt-4">
              Reviews content
            </TabsContent>
          </Tabs>
          <Pagination page={3} pageCount={9} hrefFor={(p) => `/styleguide?page=${p}`} />
          <Dialog>
            <DialogTrigger asChild>
              <Button variant="dark" className="self-start">
                Open dialog
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-[540px] p-10">
              <DialogTitle className="font-heading text-h1 font-semibold text-heading">Login</DialogTitle>
              <DialogDescription className="mt-2">Modal pattern used by Login / Register.</DialogDescription>
            </DialogContent>
          </Dialog>
        </div>
      </Section>

      <Section title="Vehicle image & card">
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
          <VehicleImage src={null} alt="Card 4:3" className="rounded-lg" />
          <VehicleImage src={null} alt="Wide 16:9" ratio="wide" className="rounded-lg" />
          <VehicleImage src={null} alt="Thumb 3:2" ratio="thumb" className="rounded-lg" />
          <VehicleCard vehicle={sampleVehicle} />
        </div>
      </Section>

      <Section title="Loading & empty states">
        <div className="grid gap-6 lg:grid-cols-2">
          <div className="flex flex-col gap-3">
            <Skeleton className="aspect-[4/3]" />
            <Skeleton className="h-5 w-2/3" />
            <Skeleton className="h-4 w-1/3" />
          </div>
          <EmptyState title="No cars match your filters" description="Try different dates or remove a filter." />
        </div>
      </Section>
    </div>
  );
}
