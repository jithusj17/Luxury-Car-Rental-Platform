"use client";

import { ChevronDown } from "lucide-react";
import { Accordion as AccordionPrimitive } from "radix-ui";

/** FAQ accordion (32_FAQ). */
export function Accordion({ items }: { items: { question: string; answer: React.ReactNode }[] }) {
  return (
    <AccordionPrimitive.Root type="single" collapsible className="flex flex-col gap-3">
      {items.map((item, i) => (
        <AccordionPrimitive.Item key={item.question} value={String(i)} className="rounded-xl border border-border bg-white">
          <AccordionPrimitive.Header>
            <AccordionPrimitive.Trigger className="group flex w-full items-center justify-between gap-4 px-6 py-5 text-left font-heading text-h5 font-medium text-heading">
              {item.question}
              <ChevronDown aria-hidden className="size-5 shrink-0 transition-transform group-data-[state=open]:rotate-180" />
            </AccordionPrimitive.Trigger>
          </AccordionPrimitive.Header>
          <AccordionPrimitive.Content className="px-6 pb-5 text-base">{item.answer}</AccordionPrimitive.Content>
        </AccordionPrimitive.Item>
      ))}
    </AccordionPrimitive.Root>
  );
}
