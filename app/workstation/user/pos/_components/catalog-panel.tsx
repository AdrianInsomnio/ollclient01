"use client";

import type { RefObject } from "react";
import { Package, RefreshCw, Search, Stethoscope } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import type { Product } from "@/lib/api/products";
import type { Service } from "@/lib/api/services";
import { CatalogItemCard, type CatalogCardEntry } from "./catalog-item-card";

type CatalogFilter = "all" | "products" | "services";
type CatalogCategory = { id: number; name: string };
type CatalogItem = {
  itemType: CatalogCardEntry["itemType"];
  item: Product | Service;
  stock?: number;
};

type CatalogPanelProps = {
  searchRef: RefObject<HTMLInputElement | null>;
  search: string;
  filter: CatalogFilter;
  categories: CatalogCategory[];
  selectedCategoryId: number | null;
  itemCount: number;
  page: number;
  pageCount: number;
  items: CatalogItem[];
  updatedAtLabel: string;
  refreshing: boolean;
  onSearchChange: (value: string) => void;
  onFilterChange: (filter: CatalogFilter) => void;
  onCategoryChange: (categoryId: number | null) => void;
  onPageChange: (page: number) => void;
  onRefresh: () => void;
  onShowInfo: (entry: CatalogCardEntry) => void;
  onAdd: (item: Product | Service, itemType: "product" | "service") => void;
};

export function CatalogPanel({
  searchRef, search, filter, categories, selectedCategoryId, itemCount, page,
  pageCount, items, updatedAtLabel, refreshing, onSearchChange, onFilterChange,
  onCategoryChange, onPageChange, onRefresh, onShowInfo, onAdd,
}: CatalogPanelProps) {
  return (
    <>
      <div className="flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-1.5 shadow-sm">
        <Search className="size-5 shrink-0 text-teal-700" />
        <Input ref={searchRef} value={search} onChange={(event) => onSearchChange(event.target.value)} placeholder="Buscar producto, medicamento, servicio o código..." className="h-8 border-0 bg-transparent px-0 text-sm shadow-none focus-visible:ring-0" />
        <kbd className="hidden rounded-md border border-slate-200 bg-slate-50 px-2 py-1 text-[10px] font-semibold text-slate-500 sm:inline">F2</kbd>
      </div>
      <div className="flex items-center justify-between gap-3">
        <div><p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-teal-700">Catálogo rápido</p><h1 className="text-lg font-bold tracking-tight text-slate-950">Productos y servicios</h1></div>
        <div className="flex items-center gap-2"><span className="hidden text-right text-[11px] leading-tight text-slate-500 sm:block"><span className="block">Actualizado a las</span><span className="font-medium text-slate-700">{updatedAtLabel}</span></span><Button type="button" variant="outline" size="icon-sm" onClick={onRefresh} disabled={refreshing} aria-label="Actualizar catálogo" title="Actualizar catálogo"><RefreshCw className={refreshing ? "size-4 animate-spin" : "size-4"} /></Button><span className="text-xs text-slate-500">{itemCount} disponibles</span></div>
      </div>
      <Tabs value={filter} onValueChange={(value) => onFilterChange(value as CatalogFilter)}>
        <TabsList className="h-8 w-full justify-start overflow-x-auto bg-white p-1 shadow-sm"><TabsTrigger value="all">Todos</TabsTrigger><TabsTrigger value="products"><Package className="size-3.5" />Productos</TabsTrigger><TabsTrigger value="services"><Stethoscope className="size-3.5" />Servicios</TabsTrigger></TabsList>
        {categories.length > 0 && <div className="mt-2 flex gap-1.5 overflow-x-auto pb-0.5"><Button type="button" size="sm" variant={selectedCategoryId === null ? "default" : "outline"} className="h-7 shrink-0 px-2.5 text-[11px]" onClick={() => onCategoryChange(null)}>Todas las categorías</Button>{categories.map((category) => <Button key={category.id} type="button" size="sm" variant={selectedCategoryId === category.id ? "default" : "outline"} className="h-7 shrink-0 px-2.5 text-[11px]" onClick={() => onCategoryChange(category.id)}>{category.name}</Button>)}</div>}
        <TabsContent value={filter} className="mt-2">
          {items.length ? <><div className="grid gap-1.5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5">{items.map(({ itemType, item, stock }) => <CatalogItemCard key={`${itemType}-${item.id}`} itemType={itemType} item={item} stock={stock} priceLabel={itemType === "product" && (item as Product).priceType === "VARIABLE" ? "Importe variable" : new Intl.NumberFormat("es-UY", { style: "currency", currency: "UYU", maximumFractionDigits: 2 }).format(Number(item.price))} onShowInfo={onShowInfo} onAdd={onAdd} />)}</div><div className="mt-2 flex items-center justify-between rounded-xl border border-slate-200 bg-white px-3 py-1.5"><span className="text-xs text-slate-500">Página {page} de {pageCount}</span><div className="flex gap-1"><Button size="sm" className="h-8" variant="outline" disabled={page === 1} onClick={() => onPageChange(Math.max(1, page - 1))}>Anterior</Button><Button size="sm" className="h-8" variant="outline" disabled={page === pageCount} onClick={() => onPageChange(Math.min(pageCount, page + 1))}>Siguiente</Button></div></div></> : <div className="rounded-xl border border-dashed border-slate-300 bg-white px-6 py-12 text-center"><Search className="mx-auto size-7 text-slate-300" /><p className="mt-3 text-sm font-semibold text-slate-700">No encontramos coincidencias</p><p className="mt-1 text-xs text-slate-500">Prueba con otro nombre o limpia el buscador.</p></div>}
        </TabsContent>
      </Tabs>
    </>
  );
}
