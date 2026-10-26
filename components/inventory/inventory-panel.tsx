"use client";

import { useEffect, useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  AlertCircle,
  ArrowDownUp,
  Boxes,
  Download,
  Ellipsis,
  Package,
  Plus,
  Printer,
  RefreshCw,
  Search,
  Wrench,
} from "lucide-react";
import { toast } from "sonner";

import { ApiError } from "@/lib/api-client";
import {
  createProduct,
  getProductStockMovements,
  getProducts,
  adjustProductStock,
  updateProduct,
  updateProductStatus,
  type Product,
  type ProductPayload,
  type StockMovement,
} from "@/lib/api/products";
import { getSuppliers } from "@/lib/api/suppliers";
import {
  createService,
  getServices,
  updateService,
  updateServiceStatus,
  type Service,
  type ServicePayload,
} from "@/lib/api/services";
import {
  createProductCategory,
  getProductCategories,
  getProductSubcategories,
  updateProductCategory,
  updateProductCategoryStatus,
  type ProductCategory,
} from "@/lib/api/product-categories";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Textarea } from "@/components/ui/textarea";
import { useAuthStore } from "@/lib/auth-store";

type Tab = "products" | "medicines" | "services" | "categories";
type InventoryMode = "inventory" | "pharmacy";
type DialogKind = "product" | "service" | "category" | null;

const money = (value?: number | null) =>
  new Intl.NumberFormat("es-UY", {
    style: "currency",
    currency: "UYU",
    maximumFractionDigits: 2,
  }).format(value ?? 0);
const dateTime = (value: string) =>
  new Intl.DateTimeFormat("es-UY", {
    dateStyle: "short",
    timeStyle: "short",
  }).format(new Date(value));

function exportProductsCsv(products: Product[]) {
  const escape = (value: string | number) =>
    `"${String(value ?? "").replaceAll('"', '""')}"`;
  const rows = [
    [
      "ID",
      "Nombre",
      "SKU",
      "Categoría",
      "Stock",
      "Stock mínimo",
      "Costo",
      "Precio",
      "Estado",
    ],
    ...products.map((product) => [
      product.id,
      product.name,
      product.sku ?? "",
      product.category?.name ?? "",
      product.stock,
      product.minStock,
      product.cost ?? "",
      product.price,
      product.isActive ? "Activo" : "Inactivo",
    ]),
  ];
  const csv = `\uFEFF${rows.map((row) => row.map(escape).join(";")).join("\n")}`;
  const url = URL.createObjectURL(
    new Blob([csv], { type: "text/csv;charset=utf-8" }),
  );
  const link = document.createElement("a");
  link.href = url;
  link.download = "inventario.csv";
  link.click();
  URL.revokeObjectURL(url);
  toast.success(`${products.length} producto(s) exportado(s).`);
}

function errorMessage(error: unknown, fallback: string) {
  if (error instanceof ApiError && error.status === 409)
    return "Ya existe un registro con esos datos.";
  return error instanceof Error ? error.message : fallback;
}

export function InventoryPanel({
  initialTab = "products",
  mode = "inventory",
}: { initialTab?: Tab; mode?: InventoryMode } = {}) {
  const isPharmacyView = mode === "pharmacy";
  const tenantId = useAuthStore((state) => state.tenantId ?? "unknown");
  const queryClient = useQueryClient();
  const [tab, setTab] = useState<Tab>(initialTab);
  const [productStockFilter, setProductStockFilter] = useState("all");
  const [filteredProducts, setFilteredProducts] = useState<Product[]>([]);
  const [dialog, setDialog] = useState<DialogKind>(null);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [productInitialCategoryId, setProductInitialCategoryId] = useState<number | undefined>();
  const [editingService, setEditingService] = useState<Service | null>(null);
  const [editingCategory, setEditingCategory] =
    useState<ProductCategory | null>(null);
  const [stockProduct, setStockProduct] = useState<Product | null>(null);
  const [movementsProduct, setMovementsProduct] = useState<Product | null>(
    null,
  );

  const productsQuery = useQuery({
    queryKey: ["inventory-products", tenantId],
    queryFn: () => getProducts({ includeDiscontinued: true }),
    staleTime: 5 * 60 * 1000,
    refetchOnWindowFocus: false,
  });
  const servicesQuery = useQuery({
    queryKey: ["inventory-services", tenantId],
    queryFn: () => getServices(),
    staleTime: 5 * 60 * 1000,
    refetchOnWindowFocus: false,
  });
  const categoriesQuery = useQuery({
    queryKey: ["inventory-categories", tenantId],
    queryFn: getProductCategories,
    staleTime: 10 * 60 * 1000,
    refetchOnWindowFocus: false,
  });

  const invalidate = async () =>
    Promise.all([
      queryClient.invalidateQueries({ queryKey: ["inventory-products"] }),
      queryClient.invalidateQueries({ queryKey: ["inventory-services"] }),
      queryClient.invalidateQueries({ queryKey: ["inventory-categories"] }),
      queryClient.invalidateQueries({ queryKey: ["products"] }),
      queryClient.invalidateQueries({ queryKey: ["services"] }),
    ]);

  const openNew = (kind: Exclude<DialogKind, null>) => {
    setEditingProduct(null);
    setProductInitialCategoryId(undefined);
    setEditingService(null);
    setEditingCategory(null);
    setDialog(kind);
  };

  const openNewMedicine = () => {
    const category = categoriesQuery.data?.find(
      (item) => item.isActive && /medicamento|farmacia/i.test(item.name),
    );
    setEditingProduct(null);
    setProductInitialCategoryId(category?.id);
    setEditingService(null);
    setEditingCategory(null);
    setDialog("product");
  };

  const openEditProduct = (product: Product) => {
    setEditingProduct(product);
    setProductInitialCategoryId(undefined);
    setDialog("product");
  };
  const openEditService = (service: Service) => {
    setEditingService(service);
    setDialog("service");
  };
  const openEditCategory = (category: ProductCategory) => {
    setEditingCategory(category);
    setDialog("category");
  };

  const productStats = useMemo(() => {
    const products = productsQuery.data ?? [];
    return {
      total: products.length,
      active: products.filter((product) => product.isActive).length,
      stocked: products.filter((product) => product.stock > 0).length,
      low: products.filter(
        (product) => product.stock > 0 && product.stock <= product.minStock,
      ).length,
      empty: products.filter((product) => product.stock === 0).length,
      inventoryValue: products.reduce(
        (total, product) => total + product.stock * (product.cost ?? 0),
        0,
      ),
      services: (servicesQuery.data ?? []).filter((service) => service.isActive)
        .length,
    };
  }, [productsQuery.data, servicesQuery.data]);

  const isLoading =
    productsQuery.isLoading ||
    servicesQuery.isLoading ||
    categoriesQuery.isLoading;
  const hasError =
    productsQuery.isError || servicesQuery.isError || categoriesQuery.isError;
  const medicines = useMemo(
    () =>
      (productsQuery.data ?? []).filter((product) =>
        /medicamento|farmacia/i.test(
          product.category?.name ??
            categoriesQuery.data?.find((item) => item.id === product.categoryId)?.name ??
            "",
        ),
      ),
    [productsQuery.data, categoriesQuery.data],
  );

  if (isLoading) return <InventorySkeleton />;
  if (hasError)
    return (
      <ErrorState
        onRetry={() => {
          void productsQuery.refetch();
          void servicesQuery.refetch();
          void categoriesQuery.refetch();
        }}
      />
    );

  return (
    <div className="h-full min-h-0 space-y-8 overflow-y-auto pb-6 pr-2">
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
        <div>
          <p className="text-sm font-medium text-muted-foreground">
            Administración
          </p>
          <h1 className="mt-1 text-2xl font-semibold tracking-tight">
            {isPharmacyView ? "Farmacia" : "Inventario"}
          </h1>
          <p className="mt-2 max-w-2xl text-sm text-muted-foreground">
            {isPharmacyView
              ? "Consulta y gestiona medicamentos, disponibilidad y movimientos de stock de la clínica."
              : "Gestiona el catálogo general, servicios, categorías y existencias de la clínica."}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button
            variant="outline"
            onClick={() => exportProductsCsv(filteredProducts)}
          >
            <Download /> Exportar CSV
          </Button>
          {!isPharmacyView && (
            <Button variant="outline" onClick={() => window.print()}>
              <Printer /> Imprimir resumen
            </Button>
          )}
          <Button variant="outline" onClick={() => void invalidate()}>
            <RefreshCw /> Actualizar
          </Button>
          {!isPharmacyView && (
            <Button variant="outline" onClick={() => openNew("service")}>
              <Wrench /> Nuevo servicio
            </Button>
          )}
          <Button onClick={isPharmacyView ? openNewMedicine : () => openNew("product")}>
            <Plus /> {isPharmacyView ? "Nuevo medicamento" : "Nuevo producto"}
          </Button>
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
        {isPharmacyView ? (
          <>
            <SummaryCard label="Medicamentos" value={medicines.length} icon={<Package />} tone="text-slate-600" />
            <SummaryCard label="Activos" value={medicines.filter((product) => product.isActive).length} icon={<Package />} tone="text-blue-600" />
            <SummaryCard label="Stock bajo" value={medicines.filter((product) => product.stock > 0 && product.stock <= product.minStock).length} icon={<ArrowDownUp />} tone="text-amber-600" />
            <SummaryCard label="Sin stock" value={medicines.filter((product) => product.stock === 0).length} icon={<Boxes />} tone="text-rose-600" />
          </>
        ) : (
          <>
            <SummaryCard label="Total productos" value={productStats.total} icon={<Package />} tone="text-slate-600" />
            <SummaryCard label="Productos activos" value={productStats.active} icon={<Package />} tone="text-blue-600" />
            <SummaryCard label="Con stock" value={productStats.stocked} icon={<Boxes />} tone="text-emerald-600" />
            <SummaryCard label="Stock bajo" value={productStats.low} icon={<ArrowDownUp />} tone="text-amber-600" />
            <SummaryCard label="Sin stock" value={productStats.empty} icon={<Boxes />} tone="text-rose-600" />
          </>
        )}
      </div>
      {!isPharmacyView && <Card>
        <CardContent className="flex flex-wrap items-center justify-between gap-3 py-4">
          <div>
            <p className="text-sm text-muted-foreground">
              Valor estimado del inventario
            </p>
            <p className="text-xl font-semibold tabular-nums">
              {money(productStats.inventoryValue)}
            </p>
          </div>
          <p className="text-sm text-muted-foreground">
            Costo registrado × stock disponible · {productStats.services}{" "}
            servicios activos
          </p>
        </CardContent>
      </Card>}

      {(isPharmacyView || tab === "products") && (
        <div className="flex flex-wrap items-center justify-end gap-2">
          <span className="text-sm text-muted-foreground">Filtrar stock</span>
          <NativeFilter
            value={productStockFilter}
            onChange={setProductStockFilter}
            options={[
              ["all", "Todo el stock"],
              ["available", "Disponible"],
              ["low", "Stock bajo"],
              ["empty", "Sin stock"],
            ]}
          />
        </div>
      )}
      {isPharmacyView ? (
        <ProductsTable
          products={medicines}
          categories={categoriesQuery.data ?? []}
          stockFilter={productStockFilter}
          title="Medicamentos registrados"
          emptyMessage="No hay medicamentos categorizados para Farmacia. Usa “Nuevo medicamento” para registrarlo."
          onFilteredChange={setFilteredProducts}
          onEdit={openEditProduct}
          onAdjust={setStockProduct}
          onMovements={setMovementsProduct}
          onRefresh={() => void invalidate()}
        />
      ) : <Tabs value={tab} onValueChange={(value) => setTab(value as Tab)}>
        <TabsList>
          <TabsTrigger value="products">Productos</TabsTrigger>
          <TabsTrigger value="services">Servicios</TabsTrigger>
          <TabsTrigger value="categories">Categorías</TabsTrigger>
        </TabsList>
        <TabsContent
          value="products"
          className="mt-5 min-h-[clamp(500px,65vh,800px)]"
        >
          <ProductsTable
            products={productsQuery.data ?? []}
            categories={categoriesQuery.data ?? []}
            stockFilter={productStockFilter}
            onFilteredChange={setFilteredProducts}
            onEdit={openEditProduct}
            onAdjust={setStockProduct}
            onMovements={setMovementsProduct}
            onRefresh={() => void invalidate()}
          />
        </TabsContent>
        <TabsContent value="services" className="mt-5">
          <ServicesTable
            services={servicesQuery.data ?? []}
            categories={categoriesQuery.data ?? []}
            onEdit={openEditService}
            onRefresh={() => void invalidate()}
          />
        </TabsContent>
        <TabsContent value="categories" className="mt-5">
          <CategoriesTable
            categories={categoriesQuery.data ?? []}
            onNew={() => openNew("category")}
            onEdit={openEditCategory}
            onRefresh={() => void invalidate()}
          />
        </TabsContent>
      </Tabs>}

      <ProductDialog
        key={`product-${editingProduct?.id ?? "new"}-${mode}-${productInitialCategoryId ?? "none"}`}
        open={dialog === "product"}
        product={editingProduct}
        categories={categoriesQuery.data ?? []}
        initialCategoryId={productInitialCategoryId}
        medicineOnly={isPharmacyView}
        onOpenChange={(open) => !open && setDialog(null)}
        onSaved={() => {
          setDialog(null);
          void invalidate();
        }}
      />
      <ServiceDialog
        key={`service-${editingService?.id ?? "new"}`}
        open={dialog === "service"}
        service={editingService}
        categories={categoriesQuery.data ?? []}
        onOpenChange={(open) => !open && setDialog(null)}
        onSaved={() => {
          setDialog(null);
          void invalidate();
        }}
      />
      <CategoryDialog
        key={`category-${editingCategory?.id ?? "new"}`}
        open={dialog === "category"}
        category={editingCategory}
        onOpenChange={(open) => !open && setDialog(null)}
        onSaved={() => {
          setDialog(null);
          void invalidate();
        }}
      />
      <StockDialog
        product={stockProduct}
        onOpenChange={(open) => !open && setStockProduct(null)}
        onSaved={() => {
          setStockProduct(null);
          void invalidate();
        }}
      />
      <MovementsDialog
        product={movementsProduct}
        onOpenChange={(open) => !open && setMovementsProduct(null)}
      />
    </div>
  );
}

function SummaryCard({
  label,
  value,
  icon,
  tone,
}: {
  label: string;
  value: number;
  icon: React.ReactNode;
  tone: string;
}) {
  return (
    <Card size="sm">
      <CardContent className="flex items-center gap-3">
        <div className={`rounded-md bg-muted p-2 ${tone}`}>{icon}</div>
        <div>
          <p className="text-sm text-muted-foreground">{label}</p>
          <p className="text-2xl font-semibold tabular-nums">{value}</p>
        </div>
      </CardContent>
    </Card>
  );
}

function ProductsTable({
  products,
  categories,
  stockFilter,
  title = "Catálogo de productos",
  emptyMessage = "No hay productos registrados",
  onFilteredChange,
  onEdit,
  onAdjust,
  onMovements,
  onRefresh,
}: {
  products: Product[];
  categories: ProductCategory[];
  stockFilter: string;
  title?: string;
  emptyMessage?: string;
  onFilteredChange: (products: Product[]) => void;
  onEdit: (product: Product) => void;
  onAdjust: (product: Product) => void;
  onMovements: (product: Product) => void;
  onRefresh: () => void;
}) {
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("all");
  const [category, setCategory] = useState("all");
  const [pageSize, setPageSize] = useState(10);
  const [page, setPage] = useState(1);
  const filtered = useMemo(
    () =>
      products.filter((product) => {
        const matchesSearch = `${product.name} ${product.sku ?? ""} ${product.supplierRecord?.name ?? product.supplier ?? ""}`
          .toLowerCase()
          .includes(search.toLowerCase());
        const matchesStatus =
          status === "all" ||
          (status === "active" ? product.isActive : !product.isActive);
        const matchesStock =
          stockFilter === "all" ||
          (stockFilter === "available"
            ? product.stock > 0
            : stockFilter === "low"
              ? product.stock > 0 && product.stock <= product.minStock
              : product.stock === 0);
        const matchesCategory =
          category === "all" || String(product.categoryId ?? "") === category;
        return (
          matchesSearch && matchesStatus && matchesStock && matchesCategory
        );
      }),
    [products, search, status, stockFilter, category],
  );
  const pageCount = Math.max(1, Math.ceil(filtered.length / pageSize));
  const currentPage = Math.min(page, pageCount);
  const paginated = useMemo(
    () => filtered.slice((currentPage - 1) * pageSize, currentPage * pageSize),
    [filtered, currentPage, pageSize],
  );
  useEffect(() => onFilteredChange(filtered), [filtered, onFilteredChange]);
  const statusMutation = useMutation({
    mutationFn: ({ id, isActive }: { id: number; isActive: boolean }) =>
      updateProductStatus(id, isActive),
    onSuccess: () => {
      toast.success("Estado del producto actualizado.");
      onRefresh();
    },
    onError: (error) =>
      toast.error(errorMessage(error, "No se pudo actualizar el producto.")),
  });
  return (
    <Card className="flex min-h-0 flex-col">
      <CardHeader className="shrink-0 gap-4">
        <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-center">
          <CardTitle className="text-base">{title}</CardTitle>
          <div className="flex flex-col gap-2 sm:flex-row">
            <div className="relative">
              <Search className="absolute left-2.5 top-2 size-4 text-muted-foreground" />
              <Input
                value={search}
                onChange={(event) => {
                  setPage(1);
                  setSearch(event.target.value);
                }}
                placeholder="Buscar producto, SKU o proveedor"
                className="pl-8 sm:w-64"
              />
            </div>
            <NativeFilter
              value={status}
              onChange={(value) => {
                setPage(1);
                setStatus(value);
              }}
              options={[
                ["all", "Todos los estados"],
                ["active", "Activos"],
                ["inactive", "Inactivos"],
              ]}
            />
            <NativeFilter
              value={category}
              onChange={(value) => {
                setPage(1);
                setCategory(value);
              }}
              options={[
                ["all", "Todas las categorías"],
                ...categories.map((item) => [String(item.id), item.name]),
              ]}
            />
          </div>
        </div>
        <div className="flex flex-wrap items-center justify-between gap-2 text-sm text-muted-foreground">
          <span>
            {filtered.length
              ? `${(currentPage - 1) * pageSize + 1}-${Math.min(currentPage * pageSize, filtered.length)} de ${filtered.length} productos`
              : "0 productos"}
          </span>
          <label className="flex items-center gap-2">
            Mostrar
            <select
              value={pageSize}
              onChange={(event) => {
                setPage(1);
                setPageSize(Number(event.target.value));
              }}
              className="h-8 rounded-md border bg-background px-2 text-sm text-foreground"
            >
              <option value={10}>10</option>
              <option value={20}>20</option>
              <option value={30}>30</option>
            </select>
          </label>
        </div>
      </CardHeader>
      <CardContent className="min-h-0 flex-1 overflow-auto p-0">
        <Table>
          <TableHeader className="sticky top-0 z-10 bg-background">
            <TableRow>
              {[
                "Producto",
                "SKU",
                "Categoría",
                "Precio",
                "Costo",
                "Stock",
                "Stock mínimo",
                "Estado",
                "Acciones",
              ].map((head) => (
                <TableHead key={head}>{head}</TableHead>
              ))}
            </TableRow>
          </TableHeader>
          <TableBody>
            {filtered.length === 0 ? (
              <EmptyRow
                colSpan={9}
                text={
                  search || status !== "all" || category !== "all"
                    ? "No hay productos para estos filtros."
                    : emptyMessage
                }
              />
            ) : (
              paginated.map((product) => (
                <TableRow key={product.id}>
                  <TableCell>
                    <div className="font-medium">{product.name}</div>
                    <div className="max-w-48 truncate text-xs text-muted-foreground">
                      {product.description || "Sin descripción"}
                    </div>
                  </TableCell>
                  <TableCell>{product.sku || "—"}</TableCell>
                  <TableCell>
                    {product.category?.name ||
                      categories.find((item) => item.id === product.categoryId)
                        ?.name ||
                      "Sin categoría"}
                  </TableCell>
                  <TableCell>
                    <div>{money(product.price)}</div>
                    {product.ivaIncluded && (
                      <Badge variant="outline" className="mt-1 text-[10px]">
                        IVA incluido
                      </Badge>
                    )}
                  </TableCell>
                  <TableCell>
                    {product.cost == null ? "—" : money(product.cost)}
                  </TableCell>
                  <TableCell>
                    <StockBadge product={product} />
                  </TableCell>
                  <TableCell>{product.minStock}</TableCell>
                  <TableCell>
                    <Badge variant={product.isActive ? "success" : "neutral"}>
                      {product.isActive ? "Activo" : "Inactivo"}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <ProductActions
                      product={product}
                      onEdit={onEdit}
                      onAdjust={onAdjust}
                      onMovements={onMovements}
                      onToggle={(isActive) =>
                        statusMutation.mutate({ id: product.id, isActive })
                      }
                    />
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
        <div className="flex items-center justify-end gap-2 border-t px-4 py-3 text-sm">
          <Button
            type="button"
            variant="outline"
            size="sm"
            disabled={currentPage <= 1}
            onClick={() => setPage((value) => Math.max(1, value - 1))}
          >
            Anterior
          </Button>
          <span className="min-w-20 text-center text-muted-foreground">
            Página {currentPage} de {pageCount}
          </span>
          <Button
            type="button"
            variant="outline"
            size="sm"
            disabled={currentPage >= pageCount}
            onClick={() => setPage((value) => Math.min(pageCount, value + 1))}
          >
            Siguiente
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

function ServicesTable({
  services,
  categories,
  onEdit,
  onRefresh,
}: {
  services: Service[];
  categories: ProductCategory[];
  onEdit: (service: Service) => void;
  onRefresh: () => void;
}) {
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("all");
  const [category, setCategory] = useState("all");
  const filtered = services.filter(
    (service) =>
      service.name.toLowerCase().includes(search.toLowerCase()) &&
      (status === "all" ||
        (status === "active" ? service.isActive : !service.isActive)) &&
      (category === "all" ||
        String(service.category ?? "") === category ||
        categories
          .find((item) => item.name === service.category)
          ?.id.toString() === category),
  );
  const statusMutation = useMutation({
    mutationFn: ({ id, isActive }: { id: number; isActive: boolean }) =>
      updateServiceStatus(id, isActive),
    onSuccess: () => {
      toast.success("Estado del servicio actualizado.");
      onRefresh();
    },
    onError: (error) =>
      toast.error(errorMessage(error, "No se pudo actualizar el servicio.")),
  });
  return (
    <Card>
      <CardHeader>
        <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-center">
          <CardTitle className="text-base">Catálogo de servicios</CardTitle>
          <div className="flex flex-wrap gap-2">
            <div className="relative">
              <Search className="absolute left-2.5 top-2 size-4 text-muted-foreground" />
              <Input
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Buscar servicio"
                className="pl-8 sm:w-64"
              />
            </div>
            <NativeFilter
              value={category}
              onChange={setCategory}
              options={[
                ["all", "Todas las categorías"],
                ...categories.map((item) => [String(item.id), item.name]),
              ]}
            />
            <NativeFilter
              value={status}
              onChange={setStatus}
              options={[
                ["all", "Todos"],
                ["active", "Activos"],
                ["inactive", "Inactivos"],
              ]}
            />
          </div>
        </div>
      </CardHeader>
      <CardContent className="p-0">
        <Table>
          <TableHeader>
            <TableRow>
              {[
                "Servicio",
                "Categoría",
                "Duración",
                "Precio",
                "Estado",
                "Acciones",
              ].map((head) => (
                <TableHead key={head}>{head}</TableHead>
              ))}
            </TableRow>
          </TableHeader>
          <TableBody>
            {filtered.length === 0 ? (
              <EmptyRow
                colSpan={6}
                text={
                  services.length
                    ? "No hay servicios para estos filtros."
                    : "No hay servicios registrados"
                }
              />
            ) : (
              filtered.map((service) => (
                <TableRow key={service.id}>
                  <TableCell>
                    <div className="font-medium">{service.name}</div>
                    <div className="max-w-56 truncate text-xs text-muted-foreground">
                      {service.description || "Sin descripción"}
                    </div>
                  </TableCell>
                  <TableCell>
                    {serviceCategoryName(service.category, categories)}
                  </TableCell>
                  <TableCell>
                    {service.duration ? `${service.duration} min` : "—"}
                  </TableCell>
                  <TableCell>{money(service.price)}</TableCell>
                  <TableCell>
                    <Badge variant={service.isActive ? "success" : "neutral"}>
                      {service.isActive ? "Activo" : "Inactivo"}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button
                          variant="ghost"
                          size="icon-sm"
                          aria-label={`Acciones de ${service.name}`}
                        >
                          <Ellipsis />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={() => onEdit(service)}>
                          Editar
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          onClick={() =>
                            statusMutation.mutate({
                              id: service.id,
                              isActive: !service.isActive,
                            })
                          }
                        >
                          {service.isActive ? "Desactivar" : "Activar"}
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}

function CategoriesTable({
  categories,
  onNew,
  onEdit,
  onRefresh,
}: {
  categories: ProductCategory[];
  onNew: () => void;
  onEdit: (category: ProductCategory) => void;
  onRefresh: () => void;
}) {
  const statusMutation = useMutation({
    mutationFn: ({ id, isActive }: { id: number; isActive: boolean }) =>
      updateProductCategoryStatus(id, isActive),
    onSuccess: () => {
      toast.success("Estado de la categoría actualizado.");
      onRefresh();
    },
    onError: (error) =>
      toast.error(errorMessage(error, "No se pudo actualizar la categoría.")),
  });
  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between gap-3">
          <div>
            <CardTitle className="text-base">Categorías</CardTitle>
            <p className="mt-1 text-sm text-muted-foreground">
              Organiza el catálogo sin eliminar categorías asociadas.
            </p>
          </div>
          <Button size="sm" onClick={onNew}>
            <Plus /> Nueva categoría
          </Button>
        </div>
      </CardHeader>
      <CardContent className="p-0">
        <Table>
          <TableHeader>
            <TableRow>
              {[
                "Nombre",
                "Descripción",
                "Productos asociados",
                "Estado",
                "Acciones",
              ].map((head) => (
                <TableHead key={head}>{head}</TableHead>
              ))}
            </TableRow>
          </TableHeader>
          <TableBody>
            {categories.length === 0 ? (
              <EmptyRow colSpan={5} text="No hay categorías registradas" />
            ) : (
              categories.map((category) => (
                <TableRow key={category.id}>
                  <TableCell className="font-medium">{category.name}</TableCell>
                  <TableCell>{category.description || "—"}</TableCell>
                  <TableCell>{category.productsCount ?? 0}</TableCell>
                  <TableCell>
                    <Badge variant={category.isActive ? "success" : "neutral"}>
                      {category.isActive ? "Activa" : "Inactiva"}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button
                          variant="ghost"
                          size="icon-sm"
                          aria-label={`Acciones de ${category.name}`}
                        >
                          <Ellipsis />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={() => onEdit(category)}>
                          Editar
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          onClick={() =>
                            statusMutation.mutate({
                              id: category.id,
                              isActive: !category.isActive,
                            })
                          }
                        >
                          {category.isActive ? "Desactivar" : "Activar"}
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}

function ProductActions({
  product,
  onEdit,
  onAdjust,
  onMovements,
  onToggle,
}: {
  product: Product;
  onEdit: (product: Product) => void;
  onAdjust: (product: Product) => void;
  onMovements: (product: Product) => void;
  onToggle: (isActive: boolean) => void;
}) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          size="icon-sm"
          aria-label={`Acciones de ${product.name}`}
        >
          <Ellipsis />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuItem onClick={() => onEdit(product)}>
          Ver detalle
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => onEdit(product)}>
          Editar
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => onAdjust(product)}>
          Ajustar stock
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => onMovements(product)}>
          Ver movimientos
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem onClick={() => onToggle(!product.isActive)}>
          {product.isActive ? "Desactivar" : "Activar"}
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

function StockBadge({ product }: { product: Product }) {
  if (product.stock === 0)
    return <Badge variant="destructive">Sin stock</Badge>;
  if (product.stock <= product.minStock)
    return <Badge variant="warning">{product.stock} · Bajo</Badge>;
  return <Badge variant="success">{product.stock} · Disponible</Badge>;
}

function NativeFilter({
  value,
  onChange,
  options,
}: {
  value: string;
  onChange: (value: string) => void;
  options: string[][];
}) {
  return (
    <select
      value={value}
      onChange={(event) => onChange(event.target.value)}
      className="h-8 rounded-lg border border-input bg-background px-2.5 text-sm outline-none focus-visible:ring-3 focus-visible:ring-ring/50"
    >
      {options.map(([optionValue, label]) => (
        <option key={optionValue} value={optionValue}>
          {label}
        </option>
      ))}
    </select>
  );
}

function EmptyRow({ colSpan, text }: { colSpan: number; text: string }) {
  return (
    <TableRow>
      <TableCell
        colSpan={colSpan}
        className="h-32 text-center text-muted-foreground"
      >
        <Package className="mx-auto mb-2 size-6" />
        {text}
      </TableCell>
    </TableRow>
  );
}

function ProductDialog({
  open,
  product,
  categories,
  initialCategoryId,
  medicineOnly = false,
  onOpenChange,
  onSaved,
}: {
  open: boolean;
  product: Product | null;
  categories: ProductCategory[];
  initialCategoryId?: number;
  medicineOnly?: boolean;
  onOpenChange: (open: boolean) => void;
  onSaved: () => void;
}) {
  const tenantId = useAuthStore((state) => state.tenantId ?? "unknown");
  const [form, setForm] = useState<ProductPayload>(() => productForm(product, initialCategoryId));
  const subcategoriesQuery = useQuery({
    queryKey: ["inventory-subcategories-form", tenantId, form.categoryId],
    queryFn: () => getProductSubcategories(Number(form.categoryId)),
    enabled: Boolean(form.categoryId),
    staleTime: 10 * 60 * 1000,
  });
  const suppliersQuery = useQuery({
    queryKey: ["inventory-suppliers-active", tenantId],
    queryFn: () => getSuppliers(true),
    staleTime: 5 * 60 * 1000,
    refetchOnWindowFocus: false,
  });
  const [availableCategories, setAvailableCategories] = useState(categories);
  const [error, setError] = useState("");
  const mutation = useMutation({
    mutationFn: () =>
      product ? updateProduct(product.id, form) : createProduct(form),
    onSuccess: () => {
      toast.success(
        product
          ? "Producto actualizado correctamente."
          : "Producto creado correctamente.",
      );
      onSaved();
    },
    onError: (error) =>
      setError(errorMessage(error, "No se pudo guardar el producto.")),
  });
  const update = <K extends keyof ProductPayload>(
    key: K,
    value: ProductPayload[K],
  ) => setForm((current) => ({ ...current, [key]: value }));
  const submit = (event: React.FormEvent) => {
    event.preventDefault();
    setError("");
    if (!form.name.trim()) return setError("El nombre es obligatorio.");
    const category = availableCategories.find((item) => item.id === form.categoryId);
    if (medicineOnly && !/medicamento|farmacia/i.test(category?.name ?? "")) {
      return setError("Selecciona una categoría de medicamentos para guardar el producto en Farmacia.");
    }
    if (
      form.price < 0 ||
      (form.cost != null && form.cost < 0) ||
      form.stock < 0 ||
      form.minStock < 0
    )
      return setError(
        "Los valores de precio, costo y stock no pueden ser negativos.",
      );
    mutation.mutate();
  };
  const selectedCategory = availableCategories.find((item) => item.id === form.categoryId);
  const isMedicine = medicineOnly || /medicamento|farmacia/i.test(selectedCategory?.name ?? "");
  const supplierOptions = [...(suppliersQuery.data ?? [])];
  if (product?.supplierRecord && !supplierOptions.some((item) => item.id === product.supplierRecord?.id)) {
    supplierOptions.push({ ...product.supplierRecord, isActive: product.supplierRecord.isActive ?? false });
  }
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>
            {product
              ? medicineOnly ? "Editar medicamento" : "Editar producto"
              : medicineOnly ? "Nuevo medicamento" : "Nuevo producto"}
          </DialogTitle>
          <DialogDescription>
            {medicineOnly
              ? "Registra el medicamento y sus datos farmacéuticos. El stock inicial queda trazado en el inventario de la clínica."
              : "Los datos se guardan en la clínica activa del usuario autenticado."}
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={submit} className="space-y-5">
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Nombre *">
              <Input
                value={form.name}
                onChange={(event) => update("name", event.target.value)}
              />
            </Field>
            <Field label="SKU">
              <Input
                value={form.sku ?? ""}
                onChange={(event) =>
                  update("sku", event.target.value || undefined)
                }
              />
            </Field>
            <Field label="Código de barras">
              <Input
                value={form.barcode ?? ""}
                onChange={(event) =>
                  update("barcode", event.target.value || undefined)
                }
              />
            </Field>
            <Field label="Marca">
              <Input
                value={form.brand ?? ""}
                onChange={(event) =>
                  update("brand", event.target.value || undefined)
                }
              />
            </Field>
            <Field label="Proveedor principal">
              <select
                value={form.supplierId == null ? "none" : String(form.supplierId)}
                onChange={(event) => {
                  const supplierId = event.target.value === "none" ? null : Number(event.target.value);
                  update("supplierId", supplierId);
                  update("supplier", null);
                }}
                disabled={suppliersQuery.isLoading}
                className="h-9 w-full rounded-lg border border-input bg-background px-3 text-sm"
              >
                <option value="none">Sin proveedor asignado</option>
                {supplierOptions.map((supplier) => (
                  <option key={supplier.id} value={String(supplier.id)}>
                    {supplier.name}{supplier.rut ? ` · ${supplier.rut}` : ""}{!supplier.isActive ? " · Inactivo (actual)" : ""}
                  </option>
                ))}
              </select>
              {suppliersQuery.isError && <span className="text-xs text-destructive">No se pudieron cargar los proveedores.</span>}
            </Field>
            <Field label="Unidad de medida">
              <Input value={form.unit ?? ""} onChange={(event) => update("unit", event.target.value || null)} placeholder="Ej.: unidad, frasco, kg" />
            </Field>
            <CategoryPicker
              value={form.categoryId ? String(form.categoryId) : "none"}
              categories={availableCategories}
              required={medicineOnly}
              onChange={(value) => {
                const categoryId = value === "none" ? undefined : Number(value);
                setForm((current) => ({
                  ...current,
                  categoryId,
                  subcategoryId: undefined,
                }));
              }}
              onCreated={(category) => {
                setAvailableCategories((current) => [...current, category]);
                update("categoryId", category.id);
              }}
            />
            {medicineOnly && !availableCategories.some((category) =>
              category.isActive && /medicamento|farmacia/i.test(category.name),
            ) && (
              <p className="text-xs text-muted-foreground sm:col-span-2">
                Aún no existe una categoría de medicamentos. Créala desde “Nueva” y selecciónala para guardar el medicamento.
              </p>
            )}
            <Field label="Subcategoría">
              <select
                value={form.subcategoryId ? String(form.subcategoryId) : "none"}
                onChange={(event) =>
                  update(
                    "subcategoryId",
                    event.target.value === "none"
                      ? undefined
                      : Number(event.target.value),
                  )
                }
                disabled={!form.categoryId || subcategoriesQuery.isLoading}
                className="h-9 w-full rounded-lg border border-input bg-background px-3 text-sm"
              >
                <option value="none">Sin subcategoría</option>
                {(subcategoriesQuery.data ?? [])
                  .filter((subcategory) => subcategory.isActive)
                  .map((subcategory) => (
                    <option key={subcategory.id} value={String(subcategory.id)}>
                      {subcategory.name}
                    </option>
                  ))}
              </select>
            </Field>
            <Field label="Descripción">
              <Textarea
                value={form.description ?? ""}
                onChange={(event) =>
                  update("description", event.target.value || undefined)
                }
                rows={2}
              />
            </Field>
          </div>
          {isMedicine && (
            <section className="space-y-3 rounded-lg border p-4">
              <div>
                <h3 className="text-sm font-medium">Datos farmacéuticos</h3>
                <p className="text-xs text-muted-foreground">
                  {medicineOnly
                    ? "Opcionales; completa los datos que correspondan al medicamento."
                    : "Opcionales; solo se muestran para categorías de medicamentos."}
                </p>
              </div>
              <div className="grid gap-4 sm:grid-cols-2">
                <Field label="Principio activo"><Input value={form.activeIngredient ?? ""} onChange={(event) => update("activeIngredient", event.target.value || null)} /></Field>
                <Field label="Concentración"><Input value={form.concentration ?? ""} onChange={(event) => update("concentration", event.target.value || null)} placeholder="Ej.: 50 mg/ml" /></Field>
                <Field label="Presentación farmacéutica"><Input value={form.dosageForm ?? ""} onChange={(event) => update("dosageForm", event.target.value || null)} placeholder="Ej.: comprimido, solución" /></Field>
                <Field label="Laboratorio"><Input value={form.laboratory ?? ""} onChange={(event) => update("laboratory", event.target.value || null)} /></Field>
                <Field label="Especies indicadas"><Input value={form.indicatedSpecies ?? ""} onChange={(event) => update("indicatedSpecies", event.target.value || null)} placeholder="Ej.: caninos, felinos" /></Field>
                <Field label="Vía de administración"><Input value={form.administrationRoute ?? ""} onChange={(event) => update("administrationRoute", event.target.value || null)} placeholder="Ej.: oral, tópica" /></Field>
              </div>
              <CheckboxField label="Requiere receta" checked={form.requiresPrescription ?? false} onChange={(checked) => update("requiresPrescription", checked)} />
            </section>
          )}
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
            <Field label="Tipo de precio">
              <select
                value={form.priceType}
                onChange={(event) => {
                  const priceType = event.target
                    .value as ProductPayload["priceType"];
                  update("priceType", priceType);
                  if (priceType === "VARIABLE") update("price", 0);
                }}
                className="h-9 w-full rounded-lg border border-input bg-background px-3 text-sm"
              >
                <option value="FIXED">Fijo</option>
                <option value="VARIABLE">Variable</option>
              </select>
            </Field>
            <Field label="Precio *">
              <Input
                type="number"
                min="0"
                step="0.01"
                value={form.price}
                disabled={form.priceType === "VARIABLE"}
                onChange={(event) =>
                  update("price", Number(event.target.value))
                }
              />
            </Field>
            {form.ivaIncluded && (
              <div className="text-xs text-muted-foreground">
                Precio sin IVA: {money(form.price / 1.22)} · IVA 22%:{" "}
                {money(form.price - form.price / 1.22)} · Precio final:{" "}
                {money(form.price)}
              </div>
            )}
            <Field label="Costo">
              <Input
                type="number"
                min="0"
                step="0.01"
                value={form.cost ?? ""}
                onChange={(event) =>
                  update(
                    "cost",
                    event.target.value === ""
                      ? undefined
                      : Number(event.target.value),
                  )
                }
              />
            </Field>
            <Field label={product ? "Stock actual" : "Stock inicial"}>
              <Input
                type="number"
                min="0"
                step="1"
                value={form.stock}
                disabled={Boolean(product)}
                onChange={(event) =>
                  update("stock", Number(event.target.value))
                }
              />
              {product && <span className="text-xs text-muted-foreground">Para cambiar stock, usa la acción de ajuste.</span>}
            </Field>
            <Field label="Stock mínimo">
              <Input
                type="number"
                min="0"
                step="1"
                value={form.minStock}
                onChange={(event) =>
                  update("minStock", Number(event.target.value))
                }
              />
            </Field>
            <Field label="Stock máximo">
              <Input
                type="number"
                min="0"
                step="1"
                value={form.maxStock ?? ""}
                onChange={(event) =>
                  update(
                    "maxStock",
                    event.target.value === ""
                      ? undefined
                      : Number(event.target.value),
                  )
                }
              />
            </Field>
          </div>
          <CheckboxField
            label="IVA incluido en el precio final"
            checked={form.ivaIncluded}
            onChange={(checked) => update("ivaIncluded", checked)}
          />
          <CheckboxField
            label="Producto activo"
            checked={form.isActive}
            onChange={(checked) => update("isActive", checked)}
          />
          {error && <p className="text-sm text-destructive">{error}</p>}
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
            >
              Cancelar
            </Button>
            <Button type="submit" disabled={mutation.isPending}>
              {mutation.isPending && <RefreshCw className="animate-spin" />}{" "}
              {product ? "Guardar cambios" : medicineOnly ? "Crear medicamento" : "Crear producto"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function ServiceDialog({
  open,
  service,
  categories,
  onOpenChange,
  onSaved,
}: {
  open: boolean;
  service: Service | null;
  categories: ProductCategory[];
  onOpenChange: (open: boolean) => void;
  onSaved: () => void;
}) {
  const [form, setForm] = useState<ServicePayload>(() => serviceForm(service));
  const [availableCategories, setAvailableCategories] = useState(categories);
  const [error, setError] = useState("");
  const mutation = useMutation({
    mutationFn: () =>
      service ? updateService(service.id, form) : createService(form),
    onSuccess: () => {
      toast.success(
        service
          ? "Servicio actualizado correctamente."
          : "Servicio creado correctamente.",
      );
      onSaved();
    },
    onError: (error) =>
      setError(errorMessage(error, "No se pudo guardar el servicio.")),
  });
  const update = <K extends keyof ServicePayload>(
    key: K,
    value: ServicePayload[K],
  ) => setForm((current) => ({ ...current, [key]: value }));
  const submit = (event: React.FormEvent) => {
    event.preventDefault();
    setError("");
    if (!form.name.trim()) return setError("El nombre es obligatorio.");
    if (form.price < 0 || (form.duration != null && form.duration <= 0))
      return setError(
        "El precio no puede ser negativo y la duración debe ser mayor a cero.",
      );
    mutation.mutate();
  };
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>
            {service ? "Editar servicio" : "Nuevo servicio"}
          </DialogTitle>
          <DialogDescription>
            Solo se utilizan campos existentes en Service.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={submit} className="space-y-4">
          <Field label="Nombre *">
            <Input
              value={form.name}
              onChange={(event) => update("name", event.target.value)}
            />
          </Field>
          <div className="grid gap-4 sm:grid-cols-2">
            <CategoryPicker
              value={form.category || "none"}
              categories={availableCategories}
              onChange={(value) =>
                update("category", value === "none" ? undefined : value)
              }
              onCreated={(category) => {
                setAvailableCategories((current) => [...current, category]);
                update("category", category.name);
              }}
            />
            <Field label="Precio *">
              <Input
                type="number"
                min="0"
                step="0.01"
                value={form.price}
                onChange={(event) =>
                  update("price", Number(event.target.value))
                }
              />
            </Field>
            <Field label="Duración (minutos)">
              <Input
                type="number"
                min="1"
                step="1"
                value={form.duration ?? ""}
                onChange={(event) =>
                  update(
                    "duration",
                    event.target.value === ""
                      ? undefined
                      : Number(event.target.value),
                  )
                }
              />
            </Field>
          </div>
          <Field label="Descripción">
            <Textarea
              value={form.description ?? ""}
              onChange={(event) =>
                update("description", event.target.value || undefined)
              }
              rows={3}
            />
          </Field>
          <CheckboxField
            label="Servicio activo"
            checked={form.isActive}
            onChange={(checked) => update("isActive", checked)}
          />
          {error && <p className="text-sm text-destructive">{error}</p>}
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
            >
              Cancelar
            </Button>
            <Button type="submit" disabled={mutation.isPending}>
              {mutation.isPending && <RefreshCw className="animate-spin" />}{" "}
              {service ? "Guardar cambios" : "Crear servicio"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function CategoryDialog({
  open,
  category,
  onOpenChange,
  onSaved,
}: {
  open: boolean;
  category: ProductCategory | null;
  onOpenChange: (open: boolean) => void;
  onSaved: () => void;
}) {
  const [name, setName] = useState(category?.name ?? "");
  const [description, setDescription] = useState(category?.description ?? "");
  const [error, setError] = useState("");
  const mutation = useMutation({
    mutationFn: () =>
      category
        ? updateProductCategory(category.id, { name, description })
        : createProductCategory({ name: name.toUpperCase(), description }),
    onSuccess: () => {
      toast.success(
        category
          ? "Categoría actualizada correctamente."
          : "Categoría creada correctamente.",
      );
      onSaved();
    },
    onError: (error) =>
      setError(errorMessage(error, "No se pudo guardar la categoría.")),
  });
  const submit = (event: React.FormEvent) => {
    event.preventDefault();
    setError("");
    if (!name.trim()) return setError("El nombre es obligatorio.");
    mutation.mutate();
  };
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>
            {category ? "Editar categoría" : "Nueva categoría"}
          </DialogTitle>
        </DialogHeader>
        <form onSubmit={submit} className="space-y-4">
          <Field label="Nombre *">
            <Input
              value={name}
              onChange={(event) => setName(event.target.value.toUpperCase())}
            />
          </Field>
          <Field label="Descripción">
            <Textarea
              value={description}
              onChange={(event) => setDescription(event.target.value)}
              rows={3}
            />
          </Field>
          {error && <p className="text-sm text-destructive">{error}</p>}
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
            >
              Cancelar
            </Button>
            <Button type="submit" disabled={mutation.isPending}>
              {mutation.isPending && <RefreshCw className="animate-spin" />}{" "}
              Guardar
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function StockDialog({
  product,
  onOpenChange,
  onSaved,
}: {
  product: Product | null;
  onOpenChange: (open: boolean) => void;
  onSaved: () => void;
}) {
  const [quantity, setQuantity] = useState("");
  const [reason, setReason] = useState("");
  const [notes, setNotes] = useState("");
  const [error, setError] = useState("");
  const mutation = useMutation({
    mutationFn: () =>
      adjustProductStock(product!.id, {
        quantity: Number(quantity),
        reason,
        notes: notes || undefined,
      }),
    onSuccess: () => {
      toast.success("Stock ajustado correctamente.");
      onSaved();
    },
    onError: (error) =>
      setError(errorMessage(error, "No se pudo ajustar el stock.")),
  });
  const submit = (event: React.FormEvent) => {
    event.preventDefault();
    setError("");
    if (!quantity || Number(quantity) === 0 || !reason.trim())
      return setError("Indica una cantidad distinta de cero y un motivo.");
    mutation.mutate();
  };
  return (
    <Dialog open={Boolean(product)} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Ajustar stock</DialogTitle>
          <DialogDescription>
            {product?.name} · Stock actual: {product?.stock ?? 0}
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={submit} className="space-y-4">
          <Field label="Cantidad (usa negativo para retirar)">
            <Input
              type="number"
              step="1"
              value={quantity}
              onChange={(event) => setQuantity(event.target.value)}
              autoFocus
            />
          </Field>
          <Field label="Motivo *">
            <Input
              value={reason}
              onChange={(event) => setReason(event.target.value)}
              placeholder="Ingreso, corrección, merma..."
            />
          </Field>
          <Field label="Notas">
            <Textarea
              value={notes}
              onChange={(event) => setNotes(event.target.value)}
              rows={3}
            />
          </Field>
          {error && <p className="text-sm text-destructive">{error}</p>}
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
            >
              Cancelar
            </Button>
            <Button type="submit" disabled={mutation.isPending}>
              {mutation.isPending && <RefreshCw className="animate-spin" />}{" "}
              Ajustar stock
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function MovementsDialog({
  product,
  onOpenChange,
}: {
  product: Product | null;
  onOpenChange: (open: boolean) => void;
}) {
  const query = useQuery({
    queryKey: ["stock-movements", product?.id],
    queryFn: () => getProductStockMovements(product!.id),
    enabled: Boolean(product),
  });
  return (
    <Dialog open={Boolean(product)} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[80vh] overflow-y-auto sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>Movimientos de stock</DialogTitle>
          <DialogDescription>{product?.name}</DialogDescription>
        </DialogHeader>
        {query.isLoading ? (
          <div className="space-y-2">
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-10 w-full" />
          </div>
        ) : query.isError ? (
          <p className="text-sm text-destructive">
            No se pudieron cargar los movimientos.
          </p>
        ) : (query.data ?? []).length === 0 ? (
          <p className="py-8 text-center text-sm text-muted-foreground">
            No hay movimientos registrados.
          </p>
        ) : (
          <div className="space-y-2">
            {(query.data ?? []).map((movement: StockMovement) => (
              <div
                key={movement.id}
                className="flex flex-wrap items-center justify-between gap-3 rounded-lg border p-3 text-sm"
              >
                <div>
                  <Badge
                    variant={movement.quantity >= 0 ? "success" : "warning"}
                  >
                    {movement.type}
                  </Badge>
                  <span className="ml-2 font-medium">
                    {movement.reason || "Sin motivo"}
                  </span>
                  <p className="mt-1 text-xs text-muted-foreground">
                    {movement.notes || "Sin notas"} ·{" "}
                    {dateTime(movement.createdAt)}
                  </p>
                </div>
                <span className="font-semibold tabular-nums">
                  {movement.quantity > 0 ? "+" : ""}
                  {movement.quantity}
                </span>
              </div>
            ))}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}

function CategoryPicker({
  value,
  categories,
  required = false,
  valueMode,
  onChange,
  onCreated,
}: {
  value: string;
  categories: ProductCategory[];
  required?: boolean;
  valueMode?: "id" | "name";
  onChange: (value: string) => void;
  onCreated: (category: ProductCategory) => void;
}) {
  const [creating, setCreating] = useState(false);
  const [name, setName] = useState("");
  const [error, setError] = useState("");
  const queryClient = useQueryClient();
  const mutation = useMutation({
    mutationFn: () =>
      createProductCategory({ name: name.trim().toUpperCase() }),
    onSuccess: (category) => {
      onCreated(category);
      void queryClient.invalidateQueries({
        queryKey: ["inventory-categories"],
      });
      setName("");
      setError("");
      setCreating(false);
      toast.success("Categoría creada correctamente.");
    },
    onError: (error) =>
      setError(errorMessage(error, "No se pudo crear la categoría.")),
  });
  const resolvedValueMode =
    valueMode ??
    (value !== "none" && Number.isNaN(Number(value)) ? "name" : "id");
  return (
    <div className="space-y-2">
      <Label>{required ? "Categoría de medicamento *" : "Categoría"}</Label>
      <div className="flex gap-2">
        <Select value={value} onValueChange={onChange}>
          <SelectTrigger className="min-w-0 flex-1">
            <SelectValue placeholder="Sin categoría" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="none">Sin categoría</SelectItem>
            {categories
              .filter((category) => category.isActive)
              .map((category) => (
                <SelectItem
                  key={category.id}
                  value={
                    resolvedValueMode === "name"
                      ? category.name
                      : String(category.id)
                  }
                >
                  {category.name}
                </SelectItem>
              ))}
          </SelectContent>
        </Select>
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() => setCreating((current) => !current)}
          aria-expanded={creating}
        >
          {" "}
          <Plus className="h-4 w-4" />{" "}
          <span className="hidden sm:inline">Nueva</span>
        </Button>
      </div>
      {creating && (
        <div className="flex gap-2">
          <Input
            autoFocus
            value={name}
            onChange={(event) => setName(event.target.value)}
            placeholder="Nombre de categoría"
          />
          <Button
            type="button"
            size="sm"
            disabled={mutation.isPending || !name.trim()}
            onClick={() => {
              setError("");
              mutation.mutate();
            }}
          >
            {mutation.isPending ? (
              <RefreshCw className="animate-spin" />
            ) : (
              "Crear"
            )}
          </Button>
        </div>
      )}
      {error && <p className="text-xs text-destructive">{error}</p>}
    </div>
  );
}

function Field({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-2">
      <Label>{label}</Label>
      {children}
    </div>
  );
}
function CheckboxField({
  label,
  checked,
  onChange,
}: {
  label: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
}) {
  return (
    <label className="flex items-center gap-2 text-sm font-medium">
      <input
        type="checkbox"
        checked={checked}
        onChange={(event) => onChange(event.target.checked)}
        className="size-4 rounded border-input accent-primary"
      />
      {label}
    </label>
  );
}
function productForm(product: Product | null, initialCategoryId?: number): ProductPayload {
  return {
    name: product?.name ?? "",
    description: product?.description ?? undefined,
    sku: product?.sku ?? undefined,
    barcode: product?.barcode ?? undefined,
    brand: product?.brand ?? undefined,
    supplier: product?.supplier ?? undefined,
    supplierId: product?.supplierId ?? null,
    unit: product?.unit ?? undefined,
    activeIngredient: product?.activeIngredient ?? undefined,
    concentration: product?.concentration ?? undefined,
    dosageForm: product?.dosageForm ?? undefined,
    laboratory: product?.laboratory ?? undefined,
    indicatedSpecies: product?.indicatedSpecies ?? undefined,
    administrationRoute: product?.administrationRoute ?? undefined,
    requiresPrescription: product?.requiresPrescription ?? undefined,
    categoryId: product?.categoryId ?? initialCategoryId,
    subcategoryId: product?.subcategoryId ?? undefined,
    priceType: product?.priceType ?? "FIXED",
    price: product?.price ?? 0,
    ivaIncluded: product?.ivaIncluded ?? true,
    cost: product?.cost ?? undefined,
    stock: product?.stock ?? 0,
    minStock: product?.minStock ?? 0,
    maxStock: product?.maxStock ?? undefined,
    isActive: product?.isActive ?? true,
  };
}
function serviceCategoryName(
  category: Service["category"],
  categories: ProductCategory[],
) {
  if (!category) return "—";
  return (
    categories.find((item) => String(item.id) === String(category))?.name ??
    category
  );
}
function serviceForm(service: Service | null): ServicePayload {
  return {
    name: service?.name ?? "",
    description: service?.description ?? undefined,
    price: service?.price ?? 0,
    duration: service?.duration ?? undefined,
    category: service?.category ?? undefined,
    isActive: service?.isActive ?? true,
  };
}
function ErrorState({ onRetry }: { onRetry: () => void }) {
  return (
    <Card>
      <CardContent className="flex flex-col items-center gap-3 py-14 text-center">
        <AlertCircle className="size-8 text-muted-foreground" />
        <p className="font-medium">No se pudo cargar el inventario</p>
        <p className="text-sm text-muted-foreground">
          Verifica tu conexión e inténtalo nuevamente.
        </p>
        <Button variant="outline" onClick={onRetry}>
          <RefreshCw /> Reintentar
        </Button>
      </CardContent>
    </Card>
  );
}
function InventorySkeleton() {
  return (
    <div className="space-y-8">
      <div className="space-y-3">
        <Skeleton className="h-4 w-24" />
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-4 w-full max-w-xl" />
      </div>
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {[1, 2, 3, 4].map((item) => (
          <Skeleton key={item} className="h-24 rounded-xl" />
        ))}
      </div>
      <Skeleton className="h-10 w-72" />
      <Skeleton className="h-96 w-full rounded-xl" />
    </div>
  );
}
