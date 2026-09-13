"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import { toast } from "sonner";
import {
  Banknote,
  BriefcaseBusiness,
  Check,
  ChevronRight,
  CircleAlert,
  Clock3,
  CreditCard,
  Loader2,
  Minus,
  Package,
  PawPrint,
  Percent,
  Plus,
  Printer,
  QrCode,
  Receipt,
  RefreshCw,
  Search,
  ShoppingCart,
  Sparkles,
  Stethoscope,
  Trash2,
  UserRound,
  X,
} from "lucide-react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useAuthStore } from "@/lib/auth-store";
import {
  createClient,
  getClients,
  getClient,
  type Client as ApiClient,
} from "@/lib/api/clients";
import { getProducts, type Product } from "@/lib/api/products";
import { getServices, type Service } from "@/lib/api/services";
import {
  createSale,
  createDraftSale,
  createWaitingSale,
  deleteSale,
  getDraftSales,
  getSaleById,
  getWaitingSales,
  resumeWaitingSale,
  updateSale,
  type Sale,
} from "@/lib/api/sales";
import { getCashRegisters, getCurrentCashShift } from "@/lib/api/cash";
import { getConsultation, type Consultation } from "@/lib/api/consultations";
import { printSaleTicket } from "@/lib/local-printer";

type Client = Pick<ApiClient, "id" | "name" | "documentId">;
type CartItem = {
  itemType: "product" | "service";
  item: Product | Service;
  quantity: number;
};
type PaymentLine = { method: string; amount: string };
type CatalogFilter = "all" | "products" | "services";

const TAX_RATE = 0.14;
const money = (value: number) =>
  new Intl.NumberFormat("es-UY", {
    style: "currency",
    currency: "UYU",
    maximumFractionDigits: 2,
  }).format(value);
const formatCatalogUpdatedAt = (timestamp: number) =>
  timestamp
    ? new Intl.DateTimeFormat("es-UY", {
        hour: "2-digit",
        minute: "2-digit",
      }).format(timestamp)
    : "pendiente";
const dateTime = (value?: string | null) =>
  value
    ? new Intl.DateTimeFormat("es-UY", {
        dateStyle: "short",
        timeStyle: "short",
      }).format(new Date(value))
    : "—";
const paymentLabels: Record<string, string> = {
  cash: "Efectivo",
  debit_card: "Débito",
  credit_card: "Crédito",
  bank_transfer: "Transferencia",
  mercado_pago: "Mercado Pago",
};
const errorText = (error: unknown, fallback: string) =>
  error instanceof Error ? error.message : fallback;

export default function PosPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const user = useAuthStore((state) => state.user);
  const searchRef = useRef<HTMLInputElement>(null);
  const [clients, setClients] = useState<Client[]>([]);
  const [clientSearch, setClientSearch] = useState("");
  const [catalogSearch, setCatalogSearch] = useState("");
  const [catalogFilter, setCatalogFilter] = useState<CatalogFilter>("all");
  const [catalogPage, setCatalogPage] = useState(1);
  const [selectedClientId, setSelectedClientId] = useState<string | null>(null);
  const [selectedClient, setSelectedClient] = useState<Client | null>(null);
  const [cart, setCart] = useState<CartItem[]>([]);
  const [initialLoading, setInitialLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [printing, setPrinting] = useState(false);
  const [printError, setPrintError] = useState<string | null>(null);
  const [cashShiftId, setCashShiftId] = useState<number | null>(null);
  const [cashRegisterName, setCashRegisterName] = useState("Caja no asignada");
  const [discountRate, setDiscountRate] = useState("0");
  const [paymentLines, setPaymentLines] = useState<PaymentLine[]>([
    { method: "cash", amount: "" },
  ]);
  const [resumedSaleId, setResumedSaleId] = useState<string | null>(null);
  const [draftId, setDraftId] = useState<string | null>(null);
  const [pendingDraft, setPendingDraft] = useState<Sale | null>(null);
  const [waitingSales, setWaitingSales] = useState<Sale[]>([]);
  const [waitingOpen, setWaitingOpen] = useState(false);
  const [waitingLoading, setWaitingLoading] = useState(false);
  const [clientOpen, setClientOpen] = useState(false);
  const [replaceCartOpen, setReplaceCartOpen] = useState(false);
  const [cancelSale, setCancelSale] = useState<Sale | null>(null);
  const [draftSaveInFlight, setDraftSaveInFlight] = useState(false);
  const [completedSales, setCompletedSales] = useState(0);
  const [activeConsultationId, setActiveConsultationId] = useState<
    string | null
  >(null);
  const [activePetId, setActivePetId] = useState<string | null>(null);

  const clinicName = user?.clinics?.[0]?.name ?? "Clínica Veterinaria";
  const userName = user?.username ?? user?.email ?? "Usuario actual";
  const productsQuery = useQuery({
    queryKey: ["products", "active"],
    queryFn: () => getProducts({ isActive: true }),
    staleTime: Infinity,
    gcTime: 30 * 60 * 1000,
    refetchOnMount: false,
    refetchOnWindowFocus: false,
  });
  const servicesQuery = useQuery({
    queryKey: ["services", "active"],
    queryFn: () => getServices({ isActive: true }),
    staleTime: Infinity,
    gcTime: 30 * 60 * 1000,
    refetchOnMount: false,
    refetchOnWindowFocus: false,
  });
  const products = useMemo(() => productsQuery.data ?? [], [productsQuery.data]);
  const services = useMemo(() => servicesQuery.data ?? [], [servicesQuery.data]);
  const catalogUpdatedAt = Math.max(
    productsQuery.dataUpdatedAt,
    servicesQuery.dataUpdatedAt,
  );
  const catalogRefreshing =
    productsQuery.isFetching || servicesQuery.isFetching;
  const catalogReady =
    !initialLoading && !productsQuery.isLoading && !servicesQuery.isLoading;

  const refreshCatalog = async () => {
    await Promise.all([productsQuery.refetch(), servicesQuery.refetch()]);
    toast.success("Catálogo actualizado.");
  };

  const loadClients = useCallback(async () => {
    try {
      const currentClients = await getClients();
      const genericClient = currentClients.find(
        (client) => client.name.trim().toLowerCase() === "consumidor final",
      );
      if (genericClient) {
        setClients(currentClients);
        return;
      }
      const createdGeneric = await createClient({
        name: "Consumidor Final",
        email: "consumidor.final@local.invalid",
        phone: "0000000",
      });
      setClients([...currentClients, createdGeneric]);
    } catch {
      toast.error("No se pudieron cargar los clientes.");
    }
  }, []);
  const loadCashShift = useCallback(async () => {
    try {
      const registers = await getCashRegisters();
      const register = registers[0];
      if (!register) return;
      setCashRegisterName(register.name);
      const shift = await getCurrentCashShift(register.id);
      setCashShiftId(shift?.id ?? null);
    } catch {
      setCashShiftId(null);
    }
  }, []);
  const refreshWaiting = useCallback(async () => {
    if (!cashShiftId) {
      setWaitingSales([]);
      return;
    }
    setWaitingLoading(true);
    try {
      setWaitingSales(await getWaitingSales(cashShiftId));
    } catch (error) {
      toast.error(
        errorText(error, "No se pudieron cargar las cuentas en espera."),
      );
    } finally {
      setWaitingLoading(false);
    }
  }, [cashShiftId]);

  useEffect(() => {
    void Promise.all([
      loadClients(),
      loadCashShift(),
    ]).finally(() => {
      setInitialLoading(false);
    });
  }, [loadCashShift, loadClients]);
  useEffect(() => {
    if (cashShiftId) void refreshWaiting();
  }, [cashShiftId, refreshWaiting]);

  useEffect(() => {
    const requestedConsultationId = searchParams.get("consultationId");
    if (
      !requestedConsultationId ||
      !catalogReady ||
      cart.length > 0 ||
      activeConsultationId
    )
      return;
    void getConsultation(requestedConsultationId)
      .then(async (consultation: Consultation) => {
        const client = await getClient(String(consultation.clientId));
        const consultationWithItems = consultation as Consultation & {
          items?: Array<{
            itemType: "product" | "service";
            itemId: number;
            quantity: number;
          }>;
        };
        const sourceItems =
          consultationWithItems.items ?? consultation.sales?.[0]?.items ?? [];
        const restoredItems = sourceItems
          .map((item) => {
            const catalogItem =
              item.itemType === "service"
                ? services.find((entry) => entry.id === item.itemId)
                : products.find((entry) => entry.id === item.itemId);
            return catalogItem
              ? {
                  itemType: item.itemType,
                  item: catalogItem,
                  quantity: item.quantity,
                }
              : null;
          })
          .filter((item): item is CartItem => item !== null);
        setSelectedClientId(String(consultation.clientId));
        setSelectedClient(client as Client);
        setActivePetId(consultation.petId ? String(consultation.petId) : null);
        setCart(restoredItems);
        setActiveConsultationId(String(consultation.id));
        if (!restoredItems.length)
          toast.info("La atención no tiene consumos asociados para cargar.");
        else
          toast.success(
            `Consumos de la atención #${consultation.id} cargados.`,
          );
      })
      .catch((error) =>
        toast.error(
          errorText(
            error,
            "No se pudieron cargar los consumos de la atención.",
          ),
        ),
      );
  }, [
    activeConsultationId,
    cart.length,
    catalogReady,
    products,
    searchParams,
    services,
  ]);

  const restoreSale = useCallback(
    async (saleId: string) => {
      const sale = await getSaleById(saleId);
      const client = await getClient(String(sale.clientId));
      const restoredItems = (sale.saleItems ?? sale.items ?? [])
        .map((item) => {
          const catalogItem =
            item.itemType === "service"
              ? services.find((entry) => entry.id === item.itemId)
              : products.find((entry) => entry.id === item.itemId);
          return catalogItem
            ? {
                itemType: item.itemType,
                item: catalogItem,
                quantity: item.quantity,
              }
            : null;
        })
        .filter((item): item is CartItem => item !== null);
      setSelectedClientId(String(sale.clientId));
      setSelectedClient(client as Client);
      setCart(restoredItems);
      setDraftId(String(sale.id));
      setActiveConsultationId(
        sale.consultationId ? String(sale.consultationId) : null,
      );
      setActivePetId(sale.petId ? String(sale.petId) : null);
      setDiscountRate(
        String(
          (sale.discount ?? 0) > 0 && (sale.subtotal ?? 0) > 0
            ? (((sale.discount ?? 0) / sale.subtotal) * 100).toFixed(2)
            : "0",
        ),
      );
      setResumedSaleId(sale.status === "WAITING" ? String(sale.id) : null);
      return sale;
    },
    [products, services],
  );

  useEffect(() => {
    const saleId = searchParams.get("resume");
    if (!saleId || !catalogReady || cart.length > 0) return;
    void restoreSale(saleId)
      .then((sale) => toast.success(`Cuenta #${sale.id} retomada.`))
      .catch((error) =>
        toast.error(
          errorText(error, "No se pudo retomar la cuenta en espera."),
        ),
      );
  }, [cart.length, catalogReady, restoreSale, searchParams]);
  useEffect(() => {
    if (
      searchParams.get("resume") ||
      !catalogReady ||
      cart.length > 0 ||
      pendingDraft
    )
      return;
    void getDraftSales()
      .then((drafts) => setPendingDraft(drafts[0] ?? null))
      .catch(() => undefined);
  }, [cart.length, catalogReady, pendingDraft, searchParams]);

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "F2") {
        event.preventDefault();
        searchRef.current?.focus();
      }
      if (event.key === "F6") {
        event.preventDefault();
        setWaitingOpen(true);
        void refreshWaiting();
      }
      if (event.key === "F12") {
        event.preventDefault();
        if (cart.length > 0) void handleCheckout();
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  });

  useEffect(() => {
    const genericClientForDraft = clients.find(
      (client) => client.name.trim().toLowerCase() === "consumidor final",
    );
    const activeClientIdForDraft =
      selectedClientId ??
      (genericClientForDraft ? String(genericClientForDraft.id) : null);
    if (
      !activeClientIdForDraft ||
      cart.length === 0 ||
      submitting ||
      draftSaveInFlight
    )
      return;
    const timer = window.setTimeout(async () => {
      setDraftSaveInFlight(true);
      try {
        const payload = {
          clientId: Number(activeClientIdForDraft),
          items: cart.map((entry) => ({
            itemType: entry.itemType,
            itemId: entry.item.id,
            quantity: entry.quantity,
            ...(entry.itemType === "service"
              ? {
                  nameSnapshot: entry.item.name,
                  priceSnapshot: entry.item.price,
                }
              : {}),
          })),
          discount: Number(discountRate) || 0,
        };
        const draft = draftId
          ? await updateSale(draftId, payload)
          : await createDraftSale(payload);
        setDraftId(String(draft.id));
      } catch (error) {
        toast.error(errorText(error, "No se pudo guardar el borrador."));
      } finally {
        setDraftSaveInFlight(false);
      }
    }, 700);
    return () => window.clearTimeout(timer);
  }, [
    cart,
    clients,
    discountRate,
    draftId,
    selectedClientId,
    submitting,
    draftSaveInFlight,
  ]);

  const filteredClients = useMemo(
    () =>
      clients.filter((client) =>
        `${client.name} ${client.documentId ?? ""}`
          .toLowerCase()
          .includes(clientSearch.toLowerCase()),
      ),
    [clients, clientSearch],
  );
  const catalogItems = useMemo(() => {
    const term = catalogSearch.toLowerCase();
    const productItems = products
      .filter(
        (item) =>
          !term ||
          `${item.name} ${item.category?.name ?? ""}`
            .toLowerCase()
            .includes(term),
      )
      .map((item) => ({ itemType: "product" as const, item }));
    const serviceItems = services
      .filter(
        (item) =>
          !term ||
          `${item.name} ${item.category ?? ""} ${item.description ?? ""}`
            .toLowerCase()
            .includes(term),
      )
      .map((item) => ({ itemType: "service" as const, item }));
    return catalogFilter === "products"
      ? productItems
      : catalogFilter === "services"
        ? serviceItems
        : [...productItems, ...serviceItems];
  }, [catalogFilter, catalogSearch, products, services]);
  const catalogPageCount = Math.max(1, Math.ceil(catalogItems.length / 8));
  const safeCatalogPage = Math.min(catalogPage, catalogPageCount);
  const paginatedCatalogItems = catalogItems.slice(
    (safeCatalogPage - 1) * 8,
    safeCatalogPage * 8,
  );
  const genericClient = useMemo(
    () =>
      clients.find(
        (client) => client.name.trim().toLowerCase() === "consumidor final",
      ) ?? null,
    [clients],
  );
  const activeClient = selectedClient ?? genericClient;
  const activeClientId =
    selectedClientId ?? (genericClient ? String(genericClient.id) : null);
  const subtotal = cart.reduce(
    (sum, entry) => sum + Number(entry.item.price) * entry.quantity,
    0,
  );
  const discount = (subtotal * (Number(discountRate) || 0)) / 100;
  const tax = (subtotal - discount) * TAX_RATE;
  const total = subtotal - discount + tax;
  const paid = paymentLines.reduce(
    (sum, line, index) =>
      sum +
      (Number(line.amount) ||
        (paymentLines.length === 1 && index === 0 ? total : 0)),
    0,
  );
  const change = Math.max(0, paid - total);
  const isCash = paymentLines[0]?.method === "cash";

  const selectClient = async (clientId: string) => {
    try {
      const client = await getClient(clientId);
      setSelectedClientId(clientId);
      setSelectedClient(client as Client);
      setClientOpen(false);
      toast.success("Tutor asociado al ticket.");
    } catch (error) {
      toast.error(errorText(error, "No se pudo cargar el cliente."));
    }
  };
  const addToCart = (
    item: Product | Service,
    itemType: CartItem["itemType"],
  ) => {
    setCart((current) => {
      const existing = current.find(
        (entry) => entry.itemType === itemType && entry.item.id === item.id,
      );
      return existing
        ? current.map((entry) =>
            entry === existing
              ? { ...entry, quantity: entry.quantity + 1 }
              : entry,
          )
        : [...current, { itemType, item, quantity: 1 }];
    });
    toast.success(`${item.name} agregado al ticket.`);
  };
  const updateQuantity = (
    itemType: CartItem["itemType"],
    itemId: number,
    quantity: number,
  ) =>
    setCart((current) =>
      quantity <= 0
        ? current.filter(
            (entry) =>
              !(entry.itemType === itemType && entry.item.id === itemId),
          )
        : current.map((entry) =>
            entry.itemType === itemType && entry.item.id === itemId
              ? { ...entry, quantity }
              : entry,
          ),
    );
  const clearTicket = () => {
    setCart([]);
    setDraftId(null);
    setResumedSaleId(null);
    setActiveConsultationId(null);
    setActivePetId(null);
    setSelectedClient(null);
    setSelectedClientId(null);
    setDiscountRate("0");
    setPaymentLines([{ method: "cash", amount: "" }]);
  };

  async function handleCheckout() {
    if (!activeClientId)
      return toast.error("No hay un cliente genérico disponible para cobrar.");
    if (!cart.length)
      return toast.error("No hay productos ni servicios en el ticket.");
    if (!cashShiftId)
      return toast.error("Abre un turno de caja antes de confirmar la venta.");
    const payments = paymentLines.map((line, index) => ({
      method: line.method,
      amount:
        Number(line.amount) ||
        (paymentLines.length === 1 && index === 0 ? total : 0),
    }));
    if (
      Math.abs(payments.reduce((sum, line) => sum + line.amount, 0) - total) >
      0.01
    )
      return toast.error("La suma de los pagos debe coincidir con el total.");
    setSubmitting(true);
    setPrintError(null);
    try {
      const payload = {
        items: cart.map((entry) => ({
          itemType: entry.itemType,
          itemId: entry.item.id,
          quantity: entry.quantity,
          ...(entry.itemType === "service"
            ? { nameSnapshot: entry.item.name, priceSnapshot: entry.item.price }
            : {}),
        })),
        paymentMethod: payments[0].method,
        payments,
        discount: Number(discountRate) || 0,
        cashShiftId,
        consultationId: activeConsultationId ?? undefined,
        petId: activePetId ?? undefined,
      };
      const sale =
        resumedSaleId || draftId
          ? await updateSale(resumedSaleId || draftId!, payload)
          : await createSale({ clientId: Number(activeClientId), ...payload });
      setPrinting(true);
      try {
        await printSaleTicket(sale);
      } catch (error: unknown) {
        setPrintError(
          errorText(
            error,
            "Cobro realizado, pero el ticket quedó pendiente de impresión.",
          ),
        );
      }
      setCompletedSales((count) => count + 1);
      clearTicket();
      toast.success("Venta cobrada correctamente.");
    } catch (error) {
      toast.error(errorText(error, "No se pudo completar el cobro."));
    } finally {
      setPrinting(false);
      setSubmitting(false);
    }
  }
  async function handleHold() {
    if (!activeClientId)
      return toast.error(
        "No hay un cliente genérico disponible para guardar la cuenta.",
      );
    if (!cashShiftId)
      return toast.error(
        "Abre un turno de caja antes de guardar una cuenta en espera.",
      );
    if (!cart.length)
      return toast.error("No hay productos ni servicios para poner en espera.");
    setSubmitting(true);
    try {
      await createWaitingSale({
        clientId: Number(activeClientId),
        draftId: draftId ?? undefined,
        cashShiftId,
        items: cart.map((entry) => ({
          itemType: entry.itemType,
          itemId: entry.item.id,
          quantity: entry.quantity,
          ...(entry.itemType === "service"
            ? { nameSnapshot: entry.item.name, priceSnapshot: entry.item.price }
            : {}),
        })),
        discount: Number(discountRate) || 0,
      });
      clearTicket();
      await refreshWaiting();
      toast.success("Cuenta puesta en espera.");
    } catch (error) {
      toast.error(errorText(error, "No se pudo guardar la cuenta en espera."));
    } finally {
      setSubmitting(false);
    }
  }
  async function continueDraft() {
    if (!pendingDraft) return;
    try {
      await restoreSale(String(pendingDraft.id));
      setPendingDraft(null);
      toast.success(`Borrador #${pendingDraft.id} retomado.`);
    } catch (error) {
      toast.error(errorText(error, "No se pudo recuperar el borrador."));
    }
  }
  async function discardDraft() {
    if (!pendingDraft) return;
    try {
      await deleteSale(String(pendingDraft.id));
      setPendingDraft(null);
      toast.success("Borrador descartado.");
    } catch (error) {
      toast.error(errorText(error, "No se pudo descartar el borrador."));
    }
  }
  async function continueWaiting(sale: Sale) {
    if (cart.length) {
      setCancelSale(sale);
      setReplaceCartOpen(true);
      return;
    }
    try {
      await resumeWaitingSale(String(sale.id));
      await restoreSale(String(sale.id));
      setWaitingOpen(false);
      await refreshWaiting();
      toast.success(`Cuenta #${sale.id} retomada.`);
    } catch (error) {
      toast.error(errorText(error, "No se pudo retomar la cuenta."));
    }
  }
  async function replaceAndContinue() {
    const sale = cancelSale;
    if (!sale || !activeClientId || !cashShiftId || !cart.length) return;
    setReplaceCartOpen(false);
    setSubmitting(true);
    try {
      await createWaitingSale({
        clientId: Number(activeClientId),
        draftId: draftId ?? undefined,
        cashShiftId,
        items: cart.map((entry) => ({
          itemType: entry.itemType,
          itemId: entry.item.id,
          quantity: entry.quantity,
          ...(entry.itemType === "service"
            ? { nameSnapshot: entry.item.name, priceSnapshot: entry.item.price }
            : {}),
        })),
        discount: Number(discountRate) || 0,
      });
      clearTicket();
      await resumeWaitingSale(String(sale.id));
      await restoreSale(String(sale.id));
      setWaitingOpen(false);
      await refreshWaiting();
      toast.success(`Venta actual pausada. Cuenta #${sale.id} retomada.`);
    } catch (error) {
      toast.error(
        errorText(
          error,
          "No se pudo guardar la venta actual o retomar la cuenta.",
        ),
      );
    } finally {
      setSubmitting(false);
      setCancelSale(null);
    }
  }
  async function cancelWaiting(sale: Sale) {
    try {
      await deleteSale(String(sale.id));
      await refreshWaiting();
      toast.success(`Cuenta #${sale.id} cancelada.`);
    } catch (error) {
      toast.error(errorText(error, "No se pudo cancelar la cuenta."));
    }
  }
  const setCashAmount = (value: string) =>
    setPaymentLines((current) =>
      current.map((line, index) =>
        index === 0 ? { ...line, amount: value } : line,
      ),
    );
  const addPayment = () =>
    setPaymentLines((current) => [...current, { method: "cash", amount: "" }]);

  if (initialLoading || productsQuery.isLoading || servicesQuery.isLoading)
    return (
      <div className="flex min-h-[50vh] items-center justify-center">
        <Loader2 className="size-6 animate-spin text-primary" />
      </div>
    );
  return (
    <div className="-m-6 flex h-[calc(100dvh-4rem)] min-h-0 flex-col overflow-hidden bg-[#f5f8f8] text-slate-900">
      <div className="mx-auto flex min-h-0 w-full max-w-[1600px] flex-1 flex-col px-4 py-2 sm:px-6 lg:px-8">
        <header className="mb-2 flex flex-wrap items-center justify-between gap-2 rounded-xl border border-slate-200/80 bg-white px-3 py-2 shadow-[0_8px_30px_rgb(15_58_58/0.05)]">
          <div className="flex min-w-0 items-center gap-2">
            <div className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-teal-700 text-white">
              <PawPrint className="size-4" />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <span className="text-sm font-bold tracking-tight">
                  POS Vet
                </span>
                <Badge variant="success" className="hidden sm:inline-flex">
                  <span className="size-1.5 rounded-full bg-emerald-600" /> En
                  línea
                </Badge>
              </div>
              <p className="truncate text-xs text-slate-500">
                {clinicName} · {cashRegisterName}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2 text-xs text-slate-500">
            <div className="hidden items-center gap-2 border-l border-slate-200 pl-3 sm:flex">
              <BriefcaseBusiness className="size-3.5 text-teal-700" />
              <span>
                <strong className="block text-slate-800">{userName}</strong>
                Turno {cashShiftId ? `#${cashShiftId}` : "sin iniciar"}
              </span>
            </div>
            <div className="hidden border-l border-slate-200 pl-3 md:block">
              <strong className="block text-slate-800">{completedSales}</strong>
              Ventas de esta sesión
            </div>
            <Button
              variant="outline"
              size="sm"
              className="border-amber-200 bg-amber-50 text-amber-800 hover:bg-amber-100"
              onClick={() => {
                setWaitingOpen(true);
                void refreshWaiting();
              }}
            >
              <Clock3 className="mr-1.5 size-4" />
              Cuentas en espera
              {waitingSales.length > 0 && (
                <span className="ml-1 rounded-full bg-amber-200 px-1.5 py-0.5 text-[10px] font-bold">
                  {waitingSales.length}
                </span>
              )}
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => router.push("/workstation/user/cash")}
            >
              <span className="hidden sm:inline">Caja</span>
              <ChevronRight className="size-4" />
            </Button>
          </div>
        </header>
        {pendingDraft && (
          <div className="mb-2 flex flex-wrap items-center justify-between gap-2 rounded-lg border border-sky-200 bg-sky-50 px-3 py-2 text-xs text-sky-950">
            <div className="flex items-center gap-2">
              <Sparkles className="size-4 text-sky-700" />
              <span>
                Hay un borrador pendiente #{pendingDraft.id} de{" "}
                {pendingDraft.client?.name ?? "la última venta"}.
              </span>
            </div>
            <div className="flex gap-2">
              <Button size="sm" className="h-7 px-2 text-xs" onClick={() => void continueDraft()}>
                Continuar
              </Button>
              <Button
                size="sm"
                className="h-7 px-2 text-xs"
                variant="ghost"
                onClick={() => void discardDraft()}
              >
                Descartar
              </Button>
            </div>
          </div>
        )}
        <div className="grid min-h-0 flex-1 items-stretch gap-3 lg:grid-cols-[minmax(0,1fr)_360px]">
          <main className="min-w-0 space-y-3 overflow-y-auto pr-1">
            <Card className="border-slate-200/80 shadow-sm">
              <CardContent className="flex flex-wrap items-center justify-between gap-2 p-2.5">
                <div className="flex min-w-0 items-center gap-2">
                  <div className="flex size-8 shrink-0 items-center justify-center rounded-full bg-teal-50 text-teal-700">
                    <UserRound className="size-4" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-400">
                      Tutor y mascota
                    </p>
                    <p className="truncate text-sm font-semibold text-slate-900">
                      {activeClient?.name ?? "Consumidor Final"}
                    </p>
                    <p className="truncate text-xs text-slate-500">
                      {selectedClient
                        ? `Documento ${selectedClient.documentId || "sin documento"} · listo para vender`
                        : "Sin cliente asociado al ticket"}
                    </p>
                  </div>
                </div>
                <Button
                  size="sm"
                  variant={selectedClient ? "outline" : "default"}
                  onClick={() => setClientOpen(true)}
                >
                  <UserRound className="mr-2 size-4" />
                  {selectedClient ? "Cambiar tutor" : "Asignar tutor / mascota"}
                </Button>
              </CardContent>
            </Card>
            <div className="flex items-center gap-3 rounded-xl border border-slate-200 bg-white px-4 py-2.5 shadow-sm">
              <Search className="size-5 shrink-0 text-teal-700" />
              <Input
                ref={searchRef}
                value={catalogSearch}
                onChange={(event) => {
                  setCatalogPage(1);
                  setCatalogSearch(event.target.value);
                }}
                placeholder="Buscar producto, medicamento, servicio o código..."
                className="h-9 border-0 bg-transparent px-0 text-sm shadow-none focus-visible:ring-0"
              />
              <kbd className="hidden rounded-md border border-slate-200 bg-slate-50 px-2 py-1 text-[10px] font-semibold text-slate-500 sm:inline">
                F2
              </kbd>
            </div>
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-teal-700">
                  Catálogo rápido
                </p>
                <h1 className="text-xl font-bold tracking-tight text-slate-950">
                  Productos y servicios
                </h1>
              </div>
              <div className="flex items-center gap-2">
                <span className="hidden text-right text-[11px] leading-tight text-slate-500 sm:block">
                  <span className="block">Actualizado a las</span>
                  <span className="font-medium text-slate-700">
                    {formatCatalogUpdatedAt(catalogUpdatedAt)}
                  </span>
                </span>
                <Button
                  type="button"
                  variant="outline"
                  size="icon-sm"
                  onClick={() => void refreshCatalog()}
                  disabled={catalogRefreshing}
                  aria-label="Actualizar catálogo"
                  title="Actualizar catálogo"
                >
                  <RefreshCw
                    className={catalogRefreshing ? "size-4 animate-spin" : "size-4"}
                  />
                </Button>
                <span className="text-xs text-slate-500">
                  {catalogItems.length} disponibles
                </span>
              </div>
            </div>
            <Tabs
              value={catalogFilter}
              onValueChange={(value) => {
                setCatalogPage(1);
                setCatalogFilter(value as CatalogFilter);
              }}
            >
              <TabsList className="w-full justify-start overflow-x-auto bg-white p-1 shadow-sm">
                <TabsTrigger value="all">Todos</TabsTrigger>
                <TabsTrigger value="products">
                  <Package className="size-3.5" />
                  Productos
                </TabsTrigger>
                <TabsTrigger value="services">
                  <Stethoscope className="size-3.5" />
                  Servicios
                </TabsTrigger>
              </TabsList>
              <TabsContent value={catalogFilter} className="mt-3">
                <div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-4">
                  {paginatedCatalogItems.map(({ itemType, item }) => {
                    const stock =
                      itemType === "product"
                        ? (item as Product).stock
                        : undefined;
                    return (
                      <Card
                        key={`${itemType}-${item.id}`}
                        className="group border-slate-200/80 bg-white transition hover:-translate-y-0.5 hover:border-teal-300 hover:shadow-md"
                      >
                        <CardContent className="flex min-h-[104px] flex-col p-2.5">
                          <div className="mb-2 flex items-start justify-between gap-2">
                            <div
                              className={`flex size-8 items-center justify-center rounded-lg ${itemType === "service" ? "bg-violet-50 text-violet-700" : "bg-teal-50 text-teal-700"}`}
                            >
                              {itemType === "service" ? (
                                <Stethoscope className="size-3.5" />
                              ) : (
                                <Package className="size-3.5" />
                              )}
                            </div>
                            <Badge
                              variant={
                                itemType === "service"
                                  ? "info"
                                  : stock === 0
                                    ? "destructive"
                                    : "success"
                              }
                            >
                              {itemType === "service"
                                ? "Servicio"
                                : stock === undefined
                                  ? "Disponible"
                                  : stock === 0
                                    ? "Sin stock"
                                    : `${stock} en stock`}
                            </Badge>
                          </div>
                          <p className="line-clamp-2 text-[13px] font-semibold leading-snug text-slate-900">
                            {item.name}
                          </p>
                          <p className="mt-1 line-clamp-2 min-h-6 text-[11px] text-slate-500">
                            {itemType === "service"
                              ? (item as Service).description ||
                                "Atención veterinaria"
                              : (item as Product).description ||
                                "Producto para clínica"}
                          </p>
                          <div className="mt-auto flex items-end justify-between gap-2 pt-2">
                            <span className="text-[13px] font-bold text-slate-900">
                              {money(Number(item.price))}
                            </span>
                            <Button
                              size="icon-sm"
                              aria-label={`Agregar ${item.name}`}
                              disabled={stock === 0}
                              onClick={() => addToCart(item, itemType)}
                              className="rounded-lg bg-teal-700 text-white shadow-sm hover:bg-teal-800"
                            >
                              <Plus className="size-4" />
                            </Button>
                          </div>
                        </CardContent>
                      </Card>
                    );
                  })}
                </div>
                {catalogItems.length > 0 && (
                  <div className="mt-4 flex items-center justify-between rounded-xl border border-slate-200 bg-white px-3 py-2">
                    <span className="text-xs text-slate-500">
                      Página {safeCatalogPage} de {catalogPageCount}
                    </span>
                    <div className="flex gap-1">
                      <Button
                        size="sm"
                        variant="outline"
                        disabled={safeCatalogPage === 1}
                        onClick={() =>
                          setCatalogPage((page) => Math.max(1, page - 1))
                        }
                      >
                        Anterior
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        disabled={safeCatalogPage === catalogPageCount}
                        onClick={() =>
                          setCatalogPage((page) =>
                            Math.min(catalogPageCount, page + 1),
                          )
                        }
                      >
                        Siguiente
                      </Button>
                    </div>
                  </div>
                )}
                {catalogItems.length === 0 && (
                  <div className="rounded-xl border border-dashed border-slate-300 bg-white px-6 py-12 text-center">
                    <Search className="mx-auto size-7 text-slate-300" />
                    <p className="mt-3 text-sm font-semibold text-slate-700">
                      No encontramos coincidencias
                    </p>
                    <p className="mt-1 text-xs text-slate-500">
                      Prueba con otro nombre o limpia el buscador.
                    </p>
                  </div>
                )}
              </TabsContent>
            </Tabs>
          </main>
          <aside className="h-full min-h-0 lg:sticky lg:top-0 lg:self-start">
            <Card className="flex h-full max-h-full flex-col overflow-hidden border-slate-200/80 bg-white shadow-[0_12px_40px_rgb(15_58_58/0.08)]">
              <CardHeader className="border-b border-slate-100 px-4 py-3">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <CardTitle className="flex items-center gap-2 text-base">
                      <Receipt className="size-4 text-teal-700" />
                      Ticket de venta
                    </CardTitle>
                    <CardDescription className="mt-1">
                      {draftId ? `Borrador #${draftId}` : "Nueva venta"} ·{" "}
                      {cart.length} líneas
                    </CardDescription>
                  </div>
                  <Button
                    variant="ghost"
                    size="icon-sm"
                    aria-label="Vaciar ticket"
                    disabled={!cart.length || submitting}
                    onClick={clearTicket}
                  >
                    <Trash2 className="size-4 text-slate-500" />
                  </Button>
                </div>
              </CardHeader>
              <ScrollArea className="min-h-0 flex-1">
                <CardContent className="space-y-4 px-5 py-4">
                  {cart.length === 0 ? (
                    <div className="flex min-h-52 flex-col items-center justify-center text-center">
                      <div className="flex size-14 items-center justify-center rounded-2xl bg-slate-50 text-slate-300">
                        <ShoppingCart className="size-7" />
                      </div>
                      <p className="mt-4 text-sm font-semibold text-slate-700">
                        Tu ticket está vacío
                      </p>
                      <p className="mt-1 max-w-[220px] text-xs leading-relaxed text-slate-500">
                        Agrega productos o servicios desde el catálogo para
                        comenzar.
                      </p>
                      <span className="mt-3 text-[11px] text-slate-400">
                        Los borradores se guardan automáticamente
                      </span>
                    </div>
                  ) : (
                    <>
                      <div className="space-y-2">
                        {cart.map((entry) => (
                          <div
                            key={`${entry.itemType}-${entry.item.id}`}
                            className="rounded-xl border border-slate-100 bg-slate-50/70 p-3"
                          >
                            <div className="flex gap-3">
                              <div className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-white text-teal-700">
                                <Package className="size-4" />
                              </div>
                              <div className="min-w-0 flex-1">
                                <div className="flex items-start justify-between gap-2">
                                  <p className="line-clamp-2 text-sm font-semibold leading-tight text-slate-800">
                                    {entry.item.name}
                                  </p>
                                  <button
                                    type="button"
                                    aria-label={`Quitar ${entry.item.name}`}
                                    className="text-slate-400 hover:text-red-600"
                                    onClick={() =>
                                      updateQuantity(
                                        entry.itemType,
                                        entry.item.id,
                                        0,
                                      )
                                    }
                                  >
                                    <X className="size-4" />
                                  </button>
                                </div>
                                <p className="mt-1 text-[11px] text-slate-500">
                                  {money(Number(entry.item.price))} c/u ·{" "}
                                  {entry.itemType === "service"
                                    ? "Servicio"
                                    : "Producto"}
                                </p>
                                <div className="mt-2 flex items-center justify-between">
                                  <div className="flex items-center gap-1 rounded-lg border border-slate-200 bg-white p-0.5">
                                    <Button
                                      variant="ghost"
                                      size="icon-sm"
                                      className="size-6"
                                      onClick={() =>
                                        updateQuantity(
                                          entry.itemType,
                                          entry.item.id,
                                          entry.quantity - 1,
                                        )
                                      }
                                    >
                                      <Minus className="size-3" />
                                    </Button>
                                    <span className="w-6 text-center text-xs font-semibold">
                                      {entry.quantity}
                                    </span>
                                    <Button
                                      variant="ghost"
                                      size="icon-sm"
                                      className="size-6"
                                      onClick={() =>
                                        updateQuantity(
                                          entry.itemType,
                                          entry.item.id,
                                          entry.quantity + 1,
                                        )
                                      }
                                    >
                                      <Plus className="size-3" />
                                    </Button>
                                  </div>
                                  <span className="text-sm font-bold text-slate-900">
                                    {money(
                                      Number(entry.item.price) * entry.quantity,
                                    )}
                                  </span>
                                </div>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                      <Separator />
                      <div className="space-y-2 text-sm">
                        <div className="flex justify-between text-slate-500">
                          <span>Subtotal</span>
                          <span>{money(subtotal)}</span>
                        </div>
                        <div className="flex items-center justify-between gap-3">
                          <Label
                            htmlFor="discount-rate"
                            className="flex items-center gap-1 text-slate-500"
                          >
                            <Percent className="size-3.5" />
                            Descuento
                          </Label>
                          <div className="flex items-center gap-1">
                            <Input
                              id="discount-rate"
                              type="number"
                              min="0"
                              max="100"
                              step="0.01"
                              value={discountRate}
                              onChange={(event) =>
                                setDiscountRate(event.target.value)
                              }
                              className="h-8 w-20 text-right"
                            />
                            <span className="text-xs text-slate-400">%</span>
                          </div>
                        </div>
                        <div className="flex justify-between text-slate-500">
                          <span>Impuestos</span>
                          <span>{money(tax)}</span>
                        </div>
                        <div className="hidden items-end justify-between border-t border-slate-100 pt-3">
                          <span className="font-semibold text-slate-700">
                            Total a cobrar
                          </span>
                          <span className="text-2xl font-bold tracking-tight text-teal-800">
                            {money(total)}
                          </span>
                        </div>
                      </div>
                      <div className="rounded-xl bg-slate-50 p-3">
                        <div className="mb-2 flex items-center justify-between">
                          <p className="text-xs font-semibold uppercase tracking-[0.12em] text-slate-500">
                            Medio de pago
                          </p>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-7 px-2 text-xs text-teal-700"
                            onClick={addPayment}
                          >
                            + Mixto
                          </Button>
                        </div>
                        <Tabs
                          value={paymentLines[0]?.method}
                          onValueChange={(value) =>
                            setPaymentLines((current) =>
                              current.map((line, index) =>
                                index === 0 ? { ...line, method: value } : line,
                              ),
                            )
                          }
                        >
                          <TabsList className="grid h-9 w-full grid-cols-3 bg-white">
                            <TabsTrigger value="cash" className="text-[11px]">
                              <Banknote className="size-3.5" />
                              Efectivo
                            </TabsTrigger>
                            <TabsTrigger
                              value="debit_card"
                              className="text-[11px]"
                            >
                              <CreditCard className="size-3.5" />
                              Tarjeta
                            </TabsTrigger>
                            <TabsTrigger
                              value="bank_transfer"
                              className="text-[11px]"
                            >
                              <QrCode className="size-3.5" />
                              QR
                            </TabsTrigger>
                          </TabsList>
                          <TabsContent
                            value={paymentLines[0]?.method}
                            className="mt-3 space-y-2"
                          >
                            <div className="space-y-1">
                              <Label
                                htmlFor="payment-amount"
                                className="text-xs text-slate-500"
                              >
                                {isCash ? "Efectivo recibido" : "Importe"}
                              </Label>
                              <Input
                                id="payment-amount"
                                type="number"
                                min="0"
                                step="0.01"
                                value={paymentLines[0]?.amount}
                                placeholder={total.toFixed(2)}
                                onChange={(event) =>
                                  setCashAmount(event.target.value)
                                }
                              />
                            </div>
                            {isCash && (
                              <div className="flex items-center justify-between rounded-lg bg-emerald-50 px-3 py-2 text-xs">
                                <span className="text-emerald-800">Vuelto</span>
                                <strong className="text-emerald-800">
                                  {money(change)}
                                </strong>
                              </div>
                            )}
                            {paymentLines.length > 1 && (
                              <div className="space-y-2 border-t border-slate-200 pt-2">
                                {paymentLines.slice(1).map((line, index) => (
                                  <div key={index + 1} className="flex gap-2">
                                    <Select
                                      value={line.method}
                                      onValueChange={(value) =>
                                        setPaymentLines((current) =>
                                          current.map((entry, lineIndex) =>
                                            lineIndex === index + 1
                                              ? { ...entry, method: value }
                                              : entry,
                                          ),
                                        )
                                      }
                                    >
                                      <SelectTrigger className="h-8 flex-1 text-xs">
                                        <SelectValue />
                                      </SelectTrigger>
                                      <SelectContent>
                                        {Object.entries(paymentLabels).map(
                                          ([value, label]) => (
                                            <SelectItem
                                              key={value}
                                              value={value}
                                            >
                                              {label}
                                            </SelectItem>
                                          ),
                                        )}
                                      </SelectContent>
                                    </Select>
                                    <Input
                                      className="h-8 w-24 text-xs"
                                      type="number"
                                      min="0"
                                      value={line.amount}
                                      onChange={(event) =>
                                        setPaymentLines((current) =>
                                          current.map((entry, lineIndex) =>
                                            lineIndex === index + 1
                                              ? {
                                                  ...entry,
                                                  amount: event.target.value,
                                                }
                                              : entry,
                                          ),
                                        )
                                      }
                                      placeholder="Importe"
                                    />
                                  </div>
                                ))}
                              </div>
                            )}
                          </TabsContent>
                        </Tabs>
                      </div>
                    </>
                  )}
              </CardContent>
              </ScrollArea>
              <div className="shrink-0 border-t border-slate-100 bg-white px-5 py-3">
                <div className="flex items-center justify-between gap-3">
                  <span className="text-sm font-semibold text-slate-700">
                    Total a cobrar
                  </span>
                  <span className="text-2xl font-bold tracking-tight text-teal-800">
                    {money(total)}
                  </span>
                </div>
              </div>
              <div className="space-y-2 border-t border-slate-100 bg-white p-5">
                <Button
                  className="h-12 w-full bg-teal-700 text-sm font-bold text-white shadow-sm hover:bg-teal-800"
                  disabled={!cart.length || submitting || printing}
                  onClick={() => void handleCheckout()}
                >
                  {submitting ? (
                    <Loader2 className="mr-2 size-4 animate-spin" />
                  ) : printing ? (
                    <Printer className="mr-2 size-4" />
                  ) : (
                    <Check className="mr-2 size-4" />
                  )}{" "}
                  {printing
                    ? "Imprimiendo ticket..."
                    : "Cobrar e imprimir ticket"}
                  <kbd className="ml-auto hidden rounded border border-white/30 px-1.5 py-0.5 text-[10px] font-medium sm:inline">
                    F12
                  </kbd>
                </Button>
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    className="flex-1 border-amber-200 text-amber-800 hover:bg-amber-50"
                    disabled={!cart.length || submitting}
                    onClick={() => void handleHold()}
                  >
                    <Clock3 className="mr-2 size-4" />
                    Poner en espera
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    aria-label="Actualizar cuentas en espera"
                    onClick={() => void refreshWaiting()}
                  >
                    <RefreshCw
                      className={
                        waitingLoading ? "size-4 animate-spin" : "size-4"
                      }
                    />
                  </Button>
                </div>
                {printError && (
                  <p className="flex items-start gap-2 text-xs text-amber-700">
                    <CircleAlert className="mt-0.5 size-3.5 shrink-0" />
                    {printError}
                  </p>
                )}
                <p className="text-center text-[10px] text-slate-400">
                  El cobro registra pagos y stock de forma atómica.
                </p>
              </div>
            </Card>
          </aside>
        </div>
        <footer className="mt-4 flex flex-wrap items-center justify-between gap-2 px-1 text-[11px] text-slate-400">
          <span>F2 buscar · F6 cuentas en espera · F12 cobrar</span>
          <span>
            {draftSaveInFlight
              ? "Guardando borrador..."
              : draftId
                ? `Borrador #${draftId} guardado`
                : "Listo para operar"}
          </span>
        </footer>
      </div>
      <Dialog open={clientOpen} onOpenChange={setClientOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Asignar tutor / mascota</DialogTitle>
            <DialogDescription>
              Busca un cliente para asociarlo al ticket actual.
            </DialogDescription>
          </DialogHeader>
          <Input
            autoFocus
            placeholder="Buscar por nombre o documento"
            value={clientSearch}
            onChange={(event) => setClientSearch(event.target.value)}
          />
          <ScrollArea className="h-72 rounded-lg border">
            <div className="space-y-1 p-2">
              {filteredClients.map((client) => (
                <button
                  type="button"
                  key={client.id}
                  className={`flex w-full items-center gap-3 rounded-lg p-3 text-left transition hover:bg-teal-50 ${selectedClientId === client.id ? "bg-teal-50 ring-1 ring-teal-200" : ""}`}
                  onClick={() => void selectClient(client.id)}
                >
                  <div className="flex size-8 items-center justify-center rounded-full bg-slate-100 text-slate-500">
                    <UserRound className="size-4" />
                  </div>
                  <span className="min-w-0 flex-1">
                    <strong className="block truncate text-sm">
                      {client.name}
                    </strong>
                    <small className="text-xs text-slate-500">
                      {client.documentId || "Sin documento"}
                    </small>
                  </span>
                  {selectedClientId === client.id && (
                    <Check className="size-4 text-teal-700" />
                  )}
                </button>
              ))}
              {!filteredClients.length && (
                <p className="p-6 text-center text-sm text-slate-500">
                  No encontramos clientes.
                </p>
              )}
            </div>
          </ScrollArea>
          <DialogFooter>
            <Button variant="outline" onClick={() => setClientOpen(false)}>
              Cerrar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      <Dialog open={waitingOpen} onOpenChange={setWaitingOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <div className="flex items-center justify-between gap-3">
              <div>
                <DialogTitle className="flex items-center gap-2">
                  <Clock3 className="size-5 text-amber-600" />
                  Cuentas en espera{" "}
                  <Badge variant={waitingSales.length ? "warning" : "neutral"}>
                    {waitingSales.length}
                  </Badge>
                </DialogTitle>
                <DialogDescription className="mt-1">
                  Ventas pausadas de este turno. No afectan la caja hasta ser
                  cobradas.
                </DialogDescription>
              </div>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => void refreshWaiting()}
                aria-label="Actualizar cuentas"
              >
                <RefreshCw
                  className={waitingLoading ? "size-4 animate-spin" : "size-4"}
                />
              </Button>
            </div>
          </DialogHeader>
          <ScrollArea className="max-h-[55vh] pr-3">
            <div className="space-y-3">
              {waitingSales.map((sale) => (
                <div
                  key={sale.id}
                  className="rounded-xl border border-slate-200 bg-slate-50/60 p-4"
                >
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-bold">
                          Cuenta #{sale.id}
                        </span>
                        <Badge variant="warning">WAITING</Badge>
                      </div>
                      <p className="mt-1 text-sm font-medium text-slate-800">
                        {sale.client?.name ?? "Consumidor Final"}
                        {sale.pet?.name ? ` · ${sale.pet.name}` : ""}
                      </p>
                      <p className="mt-1 text-xs text-slate-500">
                        {(sale.saleItems ?? sale.items ?? []).length} artículos
                        · {dateTime(sale.createdAt)}
                      </p>
                    </div>
                    <span className="text-lg font-bold text-teal-800">
                      {money(Number(sale.total || 0))}
                    </span>
                  </div>
                  <div className="mt-3 flex justify-end gap-2">
                    <Button
                      size="sm"
                      onClick={() => void continueWaiting(sale)}
                    >
                      <ChevronRight className="mr-1 size-4" />
                      Retomar
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      className="text-red-700 hover:bg-red-50"
                      onClick={() => setCancelSale(sale)}
                    >
                      Cancelar
                    </Button>
                  </div>
                </div>
              ))}
              {!waitingSales.length && (
                <div className="rounded-xl border border-dashed border-slate-300 px-6 py-12 text-center">
                  <Clock3 className="mx-auto size-8 text-slate-300" />
                  <p className="mt-3 text-sm font-semibold">
                    No hay cuentas en espera
                  </p>
                  <p className="mt-1 text-xs text-slate-500">
                    Cuando pauses un ticket aparecerá aquí.
                  </p>
                </div>
              )}
            </div>
          </ScrollArea>
        </DialogContent>
      </Dialog>
      <AlertDialog
        open={Boolean(cancelSale) && !replaceCartOpen}
        onOpenChange={(open) => {
          if (!open) setCancelSale(null);
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              ¿Cancelar esta cuenta en espera?
            </AlertDialogTitle>
            <AlertDialogDescription>
              No se ha realizado ningún cobro. La cuenta #{cancelSale?.id} se
              conservará como registro cancelado.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Volver</AlertDialogCancel>
            <AlertDialogAction
              variant="destructive"
              onClick={() => {
                if (cancelSale) void cancelWaiting(cancelSale);
                setCancelSale(null);
              }}
            >
              Cancelar cuenta
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
      <AlertDialog open={replaceCartOpen} onOpenChange={setReplaceCartOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Ya tienes una venta en curso</AlertDialogTitle>
            <AlertDialogDescription>
              ¿Quieres poner la venta actual en espera y retomar la cuenta #
              {cancelSale?.id}?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setCancelSale(null)}>
              Cancelar
            </AlertDialogCancel>
            <AlertDialogAction onClick={() => void replaceAndContinue()}>
              Poner en espera y retomar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
