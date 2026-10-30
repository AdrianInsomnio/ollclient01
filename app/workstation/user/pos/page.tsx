"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useSearchParams } from "next/navigation";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import {
  CreditCard,
  Loader2,
  Percent,
  ShoppingCart,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { CardContent } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useAuthStore } from "@/lib/auth-store";
import {
  createClient,
  getClients,
  getClient,
} from "@/lib/api/clients";
import { getProducts, type Product } from "@/lib/api/products";
import { getServices, type Service } from "@/lib/api/services";
import {
  createSale,
  createWaitingSale,
  deleteSale,
  getDraftSales,
  getSales,
  getSaleById,
  getWaitingSales,
  prepareInstallmentsForPos,
  type PosInstallmentPreparation,
  resumeWaitingSale,
  updateSale,
  type Sale,
} from "@/lib/api/sales";
import { getCashRegisters, getCurrentCashShift } from "@/lib/api/cash";
import { getConsultation, type Consultation } from "@/lib/api/consultations";
import { getClientInstallments } from "@/lib/api/subscriptions";
import { printSaleTicket } from "@/lib/local-printer";
import { calculatePosTicketTotals } from "@/lib/workstation/pos-ticket";
import { calculateFiscalAmounts } from "@/lib/workstation/fiscal";
import { CustomerPetBar } from "./_components/customer-pet-bar";
import { type CatalogCardEntry } from "./_components/catalog-item-card";
import { CatalogPanel } from "./_components/catalog-panel";
import { CartLineList, type PosCartItem } from "./_components/cart-line-list";
import { TicketSummary } from "./_components/ticket-summary";
import { PaymentPanel, type PosPaymentLine } from "./_components/payment-panel";
import { TicketActions } from "./_components/ticket-actions";
import { SaleTicket } from "./_components/sale-ticket";
import { ClearTicketDialog } from "./_components/clear-ticket-dialog";
import { ClientPickerDialog, type PosClient } from "./_components/client-picker-dialog";
import { InstallmentPickerDialog } from "./_components/installment-picker-dialog";
import { WaitingSalesDialog } from "./_components/waiting-sales-dialog";
import { WaitingSaleAlerts } from "./_components/waiting-sale-alerts";
import { CatalogInfoDialog } from "./_components/catalog-info-dialog";
import { VariablePriceDialog } from "./_components/variable-price-dialog";
import { PendingDraftBanner } from "./_components/pending-draft-banner";
import { usePosDraftAutosave } from "./_hooks/use-pos-draft-autosave";

type Client = PosClient;
type CartItem = PosCartItem;
type CatalogInfoItem = CatalogCardEntry;
type SubscriptionCharge = {
  id: number;
  periodStart: string;
  periodEnd: string;
  dueDate: string;
  totalAmount: number;
};
type PaymentLine = PosPaymentLine;
type CatalogFilter = "all" | "products" | "services";
const CATALOG_PAGE_SIZE = 20;

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
  const searchParams = useSearchParams();
  const user = useAuthStore((state) => state.user);
  const tenantId = useAuthStore((state) => state.tenantId ?? "unknown");
  const queryClient = useQueryClient();
  const searchRef = useRef<HTMLInputElement>(null);
  const [clients, setClients] = useState<Client[]>([]);
  const [clientSearch, setClientSearch] = useState("");
  const [catalogSearch, setCatalogSearch] = useState("");
  const [catalogFilter, setCatalogFilter] = useState<CatalogFilter>("all");
  const [selectedCategoryId, setSelectedCategoryId] = useState<number | null>(null);
  const [catalogPage, setCatalogPage] = useState(1);
  const [selectedClientId, setSelectedClientId] = useState<string | null>(null);
  const [selectedClient, setSelectedClient] = useState<Client | null>(null);
  const [cart, setCart] = useState<CartItem[]>([]);
  const [variableProduct, setVariableProduct] = useState<Product | null>(null);
  const [catalogInfoItem, setCatalogInfoItem] = useState<CatalogInfoItem | null>(null);
  const [variablePrice, setVariablePrice] = useState("");
  const [subscriptionCharges, setSubscriptionCharges] = useState<SubscriptionCharge[]>([]);
  const [initialLoading, setInitialLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [printing, setPrinting] = useState(false);
  const [printError, setPrintError] = useState<string | null>(null);
  const [cashShiftId, setCashShiftId] = useState<number | null>(null);
  const [cashRegisterName, setCashRegisterName] = useState("Caja no asignada");
  const [discountRate, setDiscountRate] = useState("0");
  const [discountOpen, setDiscountOpen] = useState(false);
  const [paymentsOpen, setPaymentsOpen] = useState(false);
  const [paymentLines, setPaymentLines] = useState<PaymentLine[]>([
    { method: "cash", amount: "" },
  ]);
  const [resumedSaleId, setResumedSaleId] = useState<string | null>(null);
  const checkoutInFlightRef = useRef(false);
  const [pendingDraft, setPendingDraft] = useState<Sale | null>(null);
  const [waitingSales, setWaitingSales] = useState<Sale[]>([]);
  const [waitingOpen, setWaitingOpen] = useState(false);
  const [waitingLoading, setWaitingLoading] = useState(false);
  const [matchingWaitingSale, setMatchingWaitingSale] = useState<Sale | null>(null);
  const [matchingWaitingOpen, setMatchingWaitingOpen] = useState(false);
  const [clientOpen, setClientOpen] = useState(false);
  const [installmentOpen, setInstallmentOpen] = useState(false);
  const [availableInstallments, setAvailableInstallments] = useState<PosInstallmentPreparation["installments"]>([]);
  const [selectedInstallmentIds, setSelectedInstallmentIds] = useState<number[]>([]);
  const [installmentLoading, setInstallmentLoading] = useState(false);
  const [installmentPreparing, setInstallmentPreparing] = useState(false);
  const [replaceCartOpen, setReplaceCartOpen] = useState(false);
  const [clearTicketOpen, setClearTicketOpen] = useState(false);
  const [cancelSale, setCancelSale] = useState<Sale | null>(null);
  const [completedSales, setCompletedSales] = useState(0);
  const [activeConsultationId, setActiveConsultationId] = useState<
    string | null
  >(null);
  const [activePetId, setActivePetId] = useState<string | null>(null);

  const userName = user?.username ?? user?.email ?? "Usuario actual";
  const productsQuery = useQuery({
    queryKey: ["products", "active", tenantId],
    queryFn: () => getProducts({ isActive: true }),
    staleTime: Infinity,
    gcTime: 30 * 60 * 1000,
    refetchOnMount: false,
    refetchOnWindowFocus: false,
  });
  const servicesQuery = useQuery({
    queryKey: ["services", "active", tenantId],
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

  const refreshCompletedSales = useCallback(async () => {
    if (!cashShiftId) {
      setCompletedSales(0);
      return;
    }

    try {
      const sales = await getSales({ cashShiftId });
      setCompletedSales(
        sales.filter((sale) => sale.status === "CONFIRMED").length,
      );
    } catch (error) {
      console.error("No se pudieron cargar las ventas del turno.", error);
      setCompletedSales(0);
    }
  }, [cashShiftId]);

  const insufficientStockItem = cart.find(
    (entry) =>
      entry.itemType === "product" &&
      (entry.item as Product).priceType !== "VARIABLE" &&
      entry.quantity > (entry.item as Product).stock,
  );
  const hasInsufficientStock = Boolean(insufficientStockItem);
  const {
    draftId,
    setDraftId,
    draftIdRef,
    autosavePausedRef: draftAutosavePausedRef,
    isSaving: draftSaveInFlight,
    cancelScheduledSave,
    waitForPendingSave,
  } = usePosDraftAutosave({
    clients,
    selectedClientId,
    cart,
    submitting,
    hasInsufficientStock,
    discountRate,
    checkoutInFlightRef,
  });

  useEffect(() => {
    void Promise.all([
      loadClients(),
      loadCashShift(),
    ]).finally(() => {
      setInitialLoading(false);
    });
  }, [loadCashShift, loadClients]);

  useEffect(() => {
    const rawIds = searchParams.get("subscriptionInstallmentIds");
    const clientId = searchParams.get("clientId");
    if (!rawIds || !clientId || subscriptionCharges.length || cart.length) return;
    const installmentIds = rawIds.split(",").map(Number).filter((id) => Number.isInteger(id) && id > 0);
    if (!installmentIds.length) return;
    void prepareInstallmentsForPos({ clientId: Number(clientId), installmentIds })
      .then((preparation) => {
        setSelectedClientId(String(preparation.client.id));
        setSelectedClient({
          ...preparation.client,
          id: String(preparation.client.id),
          documentId: preparation.client.documentId ?? undefined,
        });
        setSubscriptionCharges(preparation.installments.map((item) => ({
          id: item.id,
          periodStart: item.periodStart,
          periodEnd: item.periodEnd,
          dueDate: item.dueDate,
          totalAmount: Number(item.totalAmount),
        })));
        setDiscountRate("0");
        toast.success("Cuotas cargadas en el POS.");
      })
      .catch((error) => toast.error(errorText(error, "No se pudieron cargar las cuotas en el POS.")));
  }, [cart.length, searchParams, subscriptionCharges.length]);
  useEffect(() => {
    if (cashShiftId) void refreshWaiting();
  }, [cashShiftId, refreshWaiting]);

  useEffect(() => {
    void refreshCompletedSales();
  }, [refreshCompletedSales]);

  useEffect(() => {
    window.dispatchEvent(
      new CustomEvent("pos-header-state", {
        detail: {
          userName,
          cashRegisterName,
          cashShiftId,
          completedSales,
          waitingCount: waitingSales.length,
        },
      }),
    );
  }, [cashRegisterName, cashShiftId, completedSales, userName, waitingSales.length]);

  useEffect(() => {
    const openWaiting = () => {
      setWaitingOpen(true);
      void refreshWaiting();
    };
    window.addEventListener("pos-open-waiting", openWaiting);
    return () => window.removeEventListener("pos-open-waiting", openWaiting);
  }, [refreshWaiting]);

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
    async (saleId: string, additionalItems: CartItem[] = []) => {
      const sale = await getSaleById(saleId);
      const client = await getClient(String(sale.clientId));
      const restoredItems = (sale.saleItems ?? sale.items ?? [])
        .map((item) => {
          const catalogItem =
            item.itemType === "service"
              ? services.find((entry) => entry.id === item.itemId)
              : products.find((entry) => entry.id === item.itemId);
          const savedUnitPrice = Number(item.priceSnapshot);
          return catalogItem
            ? {
                itemType: item.itemType,
                item: catalogItem,
                quantity: item.quantity,
                ...(Number.isFinite(savedUnitPrice)
                  ? { unitPrice: savedUnitPrice }
                  : {}),
              }
            : null;
        })
        .filter((item): item is CartItem => item !== null);
      setSelectedClientId(String(sale.clientId));
      setSelectedClient(client as Client);
      const mergedItems = [...restoredItems];
      additionalItems.forEach((additionalItem) => {
        const existing = mergedItems.find(
          (entry) =>
            entry.itemType === additionalItem.itemType &&
            entry.item.id === additionalItem.item.id,
        );
        if (existing) existing.quantity += additionalItem.quantity;
        else mergedItems.push(additionalItem);
      });
      setCart(mergedItems);
      draftIdRef.current = String(sale.id);
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
    [draftIdRef, products, services, setDraftId],
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
      if (event.key === "F8") {
        event.preventDefault();
        if (hasTicketItems && !hasInsufficientStock) void handleCheckout();
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  });

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
          (selectedCategoryId === null || item.categoryId === selectedCategoryId) &&
          (!term ||
            `${item.name} ${item.category?.name ?? ""}`
              .toLowerCase()
              .includes(term)),
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
        ? selectedCategoryId === null
          ? serviceItems
          : []
        : [...productItems, ...serviceItems];
  }, [catalogFilter, catalogSearch, products, selectedCategoryId, services]);
  const catalogCategories = useMemo(
    () =>
      products
        .filter((item) => item.category?.id && item.category.name)
        .reduce<Array<{ id: number; name: string }>>((categories, item) => {
          const category = item.category!;
          if (!categories.some((entry) => entry.id === category.id)) {
            categories.push({ id: category.id, name: category.name });
          }
          return categories;
        }, [])
        .sort((first, second) => first.name.localeCompare(second.name, "es")),
    [products],
  );
  const catalogPageCount = Math.max(
    1,
    Math.ceil(catalogItems.length / CATALOG_PAGE_SIZE),
  );
  const safeCatalogPage = Math.min(catalogPage, catalogPageCount);
  const paginatedCatalogItems = catalogItems.slice(
    (safeCatalogPage - 1) * CATALOG_PAGE_SIZE,
    safeCatalogPage * CATALOG_PAGE_SIZE,
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
  const {
    subtotal,
    tax,
    total,
    hasTicketItems,
    paymentReceived,
    pendingBalance,
    overpayment,
    change,
    isCash,
  } = calculatePosTicketTotals({
    cart,
    charges: subscriptionCharges,
    discountRate,
    paymentLines,
  });
  const variablePriceAmounts = variableProduct?.ivaIncluded !== false && Number(variablePrice) > 0
    ? calculateFiscalAmounts(Number(variablePrice), 1, true)
    : null;

  const selectClient = async (clientId: string) => {
    try {
      const client = await getClient(clientId);
      setSelectedClientId(clientId);
      setSelectedClient(client as Client);
      setClientOpen(false);
      let waitingSale = waitingSales.find(
        (sale) => String(sale.clientId) === String(clientId),
      );
      if (!waitingSale && cashShiftId) {
        const currentWaitingSales = await getWaitingSales(cashShiftId);
        setWaitingSales(currentWaitingSales);
        waitingSale = currentWaitingSales.find(
          (sale) => String(sale.clientId) === String(clientId),
        );
      }
      if (waitingSale) {
        setMatchingWaitingSale(waitingSale);
        setMatchingWaitingOpen(true);
        return;
      }
      toast.success("Tutor asociado al ticket.");
    } catch (error) {
      toast.error(errorText(error, "No se pudo cargar el cliente."));
    }
  };

  const openInstallmentPicker = async () => {
    if (!selectedClientId) return toast.error("Selecciona un cliente antes de cargar cuotas.");
    if (cart.length) return toast.error("Vacía los productos o servicios del ticket antes de cargar cuotas.");
    setInstallmentLoading(true);
    try {
      setAvailableInstallments(await getClientInstallments(selectedClientId));
      setSelectedInstallmentIds([]);
      setInstallmentOpen(true);
    } catch (error) {
      toast.error(errorText(error, "No se pudieron cargar las cuotas pendientes."));
    } finally {
      setInstallmentLoading(false);
    }
  };

  const toggleInstallment = (installment: PosInstallmentPreparation["installments"][number]) => {
    setSelectedInstallmentIds((current) => {
      if (current.includes(installment.id)) return current.filter((id) => id !== installment.id);
      const isFuture = new Date(installment.dueDate) > new Date();
      const withoutFuture = current.filter((id) => {
        const item = availableInstallments.find((candidate) => candidate.id === id);
        return !item || new Date(item.dueDate) <= new Date();
      });
      return isFuture ? [...withoutFuture, installment.id] : [...current, installment.id];
    });
  };

  const loadInstallmentsInTicket = async () => {
    if (!selectedClientId || !selectedInstallmentIds.length) return;
    setInstallmentPreparing(true);
    try {
      const futureInstallmentId = availableInstallments.find((item) => selectedInstallmentIds.includes(item.id) && new Date(item.dueDate) > new Date())?.id;
      const preparation = await prepareInstallmentsForPos({ clientId: Number(selectedClientId), installmentIds: selectedInstallmentIds, futureInstallmentId });
      setCart([]);
      setSubscriptionCharges(preparation.installments.map((item) => ({ id: item.id, periodStart: item.periodStart, periodEnd: item.periodEnd, dueDate: item.dueDate, totalAmount: Number(item.totalAmount) })));
      setDiscountRate("0");
      setInstallmentOpen(false);
      toast.success("Cuotas cargadas en el ticket.");
    } catch (error) {
      toast.error(errorText(error, "No se pudieron preparar las cuotas."));
    } finally {
      setInstallmentPreparing(false);
    }
  };
  const addToCart = (
    item: Product | Service,
    itemType: CartItem["itemType"],
  ) => {
    if (subscriptionCharges.length) {
      toast.error("No se pueden mezclar cuotas con productos o servicios.");
      return;
    }
    if (itemType === "product" && (item as Product).priceType === "VARIABLE") {
      setVariableProduct(item as Product);
      setVariablePrice("");
      return;
    }
    addCartLine(item, itemType);
  };
  const addCartLine = (
    item: Product | Service,
    itemType: CartItem["itemType"],
    unitPrice?: number,
  ) => {
    if (
      itemType === "product" &&
      (item as Product).priceType !== "VARIABLE"
    ) {
      const existing = cart.find(
        (entry) =>
          entry.itemType === itemType &&
          entry.item.id === item.id &&
          entry.unitPrice === unitPrice,
      );
      const requestedQuantity = (existing?.quantity ?? 0) + 1;
      if (requestedQuantity > (item as Product).stock) {
        toast.error(
          `Stock insuficiente para ${item.name}. Disponible: ${(item as Product).stock}.`,
        );
        return;
      }
    }
    setCart((current) => {
      const existing = current.find(
        (entry) => entry.itemType === itemType && entry.item.id === item.id && entry.unitPrice === unitPrice,
      );
      return existing
        ? current.map((entry) =>
            entry === existing
              ? { ...entry, quantity: entry.quantity + 1 }
              : entry,
          )
        : [...current, { itemType, item, quantity: 1, unitPrice }];
    });
    toast.success(`${item.name} agregado al ticket.`);
  };
  const confirmVariableProduct = () => {
    const price = Number(variablePrice);
    if (!variableProduct || !Number.isFinite(price) || price <= 0) {
      toast.error("Ingresa un importe mayor que cero.");
      return;
    }
    addCartLine(variableProduct, "product", price);
    setVariableProduct(null);
    setVariablePrice("");
  };
  const updateQuantity = (
    itemType: CartItem["itemType"],
    itemId: number,
    quantity: number,
  ) => {
    const entry = cart.find(
      (item) => item.itemType === itemType && item.item.id === itemId,
    );
    if (
      entry &&
      quantity > 0 &&
      entry.itemType === "product" &&
      (entry.item as Product).priceType !== "VARIABLE" &&
      quantity > (entry.item as Product).stock
    ) {
      toast.error(
        `Stock insuficiente para ${entry.item.name}. Disponible: ${(entry.item as Product).stock}.`,
      );
      return;
    }
    setCart((current) =>
      quantity <= 0
        ? current.filter(
            (item) =>
              !(item.itemType === itemType && item.item.id === itemId),
          )
        : current.map((item) =>
            item.itemType === itemType && item.item.id === itemId
              ? { ...item, quantity }
              : item,
          ),
    );
  };
  const clearTicket = () => {
    cancelScheduledSave();
    setCart([]);
    setSubscriptionCharges([]);
    draftIdRef.current = null;
    setDraftId(null);
    setResumedSaleId(null);
    setActiveConsultationId(null);
    setActivePetId(null);
    setSelectedClient(null);
    setSelectedClientId(null);
    setDiscountRate("0");
    setDiscountOpen(false);
    setPaymentsOpen(false);
    setPaymentLines([{ method: "cash", amount: "" }]);
  };

  async function handleCheckout() {
    if (!activeClientId)
      return toast.error("No hay un cliente genérico disponible para cobrar.");
    if (!hasTicketItems)
      return toast.error("No hay productos ni servicios en el ticket.");
    if (insufficientStockItem) {
      const product = insufficientStockItem.item as Product;
      return toast.error(
        `Stock insuficiente para ${product.name}. Disponible: ${product.stock}, solicitado: ${insufficientStockItem.quantity}.`,
      );
    }
    if (!cashShiftId)
      return toast.error("Abre un turno de caja antes de confirmar la venta.");
    cancelScheduledSave();
    const payments =
      paymentLines.length === 1 && !Number(paymentLines[0]?.amount)
        ? [{ method: "cash", amount: total }]
        : paymentLines.map((line) => ({
            method: line.method,
            amount: Number(line.amount) || 0,
          }));
    if (
      Math.abs(payments.reduce((sum, line) => sum + line.amount, 0) - total) >
      0.01
    )
      return toast.error("La suma de los pagos debe coincidir con el total.");
    if (checkoutInFlightRef.current) return;
    checkoutInFlightRef.current = true;
    setSubmitting(true);
    setPrintError(null);
    try {
      await waitForPendingSave();
      const payload = {
        items: cart.map((entry) => ({
          itemType: entry.itemType,
          itemId: entry.item.id,
          quantity: entry.quantity,
          ...(entry.itemType === "service" || (entry.itemType === "product" && (entry.item as Product).priceType === "VARIABLE")
              ? { nameSnapshot: entry.item.name, priceSnapshot: entry.unitPrice ?? entry.item.price }
              : {}),
        })),
        paymentMethod: payments[0].method,
        payments,
        discount: Number(discountRate) || 0,
        cashShiftId,
        consultationId: activeConsultationId ?? undefined,
        petId: activePetId ?? undefined,
        subscriptionInstallmentIds: subscriptionCharges.map((item) => item.id),
      };
      const checkoutDraftId = subscriptionCharges.length
        ? null
        : resumedSaleId || draftIdRef.current || draftId;
      const sale =
        checkoutDraftId
          ? await updateSale(checkoutDraftId, payload)
          : await createSale({ clientId: Number(activeClientId), ...payload });
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["products", "active", tenantId] }),
        queryClient.invalidateQueries({ queryKey: ["inventory-products", tenantId] }),
        queryClient.invalidateQueries({ queryKey: ["inventory-viewer-products", tenantId] }),
      ]);
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
      await refreshCompletedSales();
      clearTicket();
      toast.success("Venta cobrada correctamente.");
    } catch (error) {
      toast.error(errorText(error, "No se pudo completar el cobro."), {
        id: "pos-checkout-error",
      });
    } finally {
      checkoutInFlightRef.current = false;
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
    if (!cart.length || subscriptionCharges.length)
      return toast.error("No hay productos ni servicios para poner en espera.");
    if (insufficientStockItem) {
      const product = insufficientStockItem.item as Product;
      return toast.error(
        `Stock insuficiente para ${product.name}. Disponible: ${product.stock}, solicitado: ${insufficientStockItem.quantity}.`,
      );
    }
    cancelScheduledSave();
    setSubmitting(true);
    try {
      await waitForPendingSave();
      await createWaitingSale({
        clientId: Number(activeClientId),
        draftId: draftId ?? undefined,
        cashShiftId,
        items: cart.map((entry) => ({
          itemType: entry.itemType,
          itemId: entry.item.id,
          quantity: entry.quantity,
          ...(entry.itemType === "service" || (entry.itemType === "product" && (entry.item as Product).priceType === "VARIABLE")
            ? { nameSnapshot: entry.item.name, priceSnapshot: entry.unitPrice ?? entry.item.price }
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
  async function continueMatchingWaiting() {
    const sale = matchingWaitingSale;
    if (!sale) return;
    const additionalItems = [...cart];
    draftAutosavePausedRef.current = true;
    cancelScheduledSave();
    setSubmitting(true);
    setMatchingWaitingOpen(false);
    try {
      await waitForPendingSave();
      const currentDraftId = draftIdRef.current ?? draftId;
      if (currentDraftId && String(currentDraftId) !== String(sale.id)) {
        await deleteSale(String(currentDraftId));
        draftIdRef.current = null;
        setDraftId(null);
        setResumedSaleId(null);
      }
      await resumeWaitingSale(String(sale.id));
      await restoreSale(String(sale.id), additionalItems);
      setMatchingWaitingSale(null);
      await refreshWaiting();
      toast.success(`Cuenta #${sale.id} retomada. Los productos fueron juntados.`);
    } catch (error) {
      toast.error(errorText(error, "No se pudo juntar la nueva venta con la cuenta en espera."));
    } finally {
      draftAutosavePausedRef.current = false;
      setSubmitting(false);
    }
  }
  function keepNewSale() {
    setMatchingWaitingOpen(false);
    setMatchingWaitingSale(null);
    toast.success("Se mantuvo la cuenta en espera y se inició una venta nueva.");
  }
  async function replaceAndContinue() {
    const sale = cancelSale;
    if (!sale || !activeClientId || !cashShiftId || !cart.length) return;
    draftAutosavePausedRef.current = true;
    setReplaceCartOpen(false);
    cancelScheduledSave();
    setSubmitting(true);
    try {
      await waitForPendingSave();
      await createWaitingSale({
        clientId: Number(activeClientId),
        draftId: draftId ?? undefined,
        cashShiftId,
        items: cart.map((entry) => ({
          itemType: entry.itemType,
          itemId: entry.item.id,
          quantity: entry.quantity,
            ...(entry.itemType === "service" || (entry.itemType === "product" && (entry.item as Product).priceType === "VARIABLE")
            ? { nameSnapshot: entry.item.name, priceSnapshot: entry.unitPrice ?? entry.item.price }
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
      draftAutosavePausedRef.current = false;
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
  const removePayment = (indexToRemove: number) =>
    setPaymentLines((current) =>
      current.length <= 1
        ? current
        : current.filter((_, index) => index !== indexToRemove),
    );

  if (initialLoading || productsQuery.isLoading || servicesQuery.isLoading)
    return (
      <div className="flex min-h-[50vh] items-center justify-center">
        <Loader2 className="size-6 animate-spin text-primary" />
      </div>
    );
  return (
    <div className="flex h-full min-h-0 w-full flex-col overflow-hidden bg-[#f5f8f8] text-slate-900">
      <div className="flex min-h-0 w-full flex-1 flex-col px-3 py-2 sm:px-4 lg:px-5 2xl:px-6">

        {pendingDraft && <PendingDraftBanner draft={pendingDraft} onContinue={() => void continueDraft()} onDiscard={() => void discardDraft()} />}        <div className="grid min-h-0 flex-1 items-stretch gap-3 lg:grid-cols-[minmax(0,3fr)_minmax(320px,1fr)]">
          <main className="min-w-0 space-y-2 overflow-y-auto pr-1">
            <CustomerPetBar
              clientName={activeClient?.name ?? "Consumidor Final"}
              documentId={selectedClient?.documentId}
              hasSelectedClient={Boolean(selectedClient)}
              canLoadInstallments={Boolean(selectedClientId) && !cart.length}
              installmentsLoading={installmentLoading}
              onChooseClient={() => setClientOpen(true)}
              onLoadInstallments={() => void openInstallmentPicker()}
            />
            <CatalogPanel
              searchRef={searchRef}
              search={catalogSearch}
              filter={catalogFilter}
              categories={catalogCategories}
              selectedCategoryId={selectedCategoryId}
              itemCount={catalogItems.length}
              page={safeCatalogPage}
              pageCount={catalogPageCount}
              items={paginatedCatalogItems.map(({ itemType, item }) => ({
                itemType,
                item,
                stock: itemType === "product" && (item as Product).priceType !== "VARIABLE"
                  ? (item as Product).stock
                  : undefined,
              }))}
              updatedAtLabel={formatCatalogUpdatedAt(catalogUpdatedAt)}
              refreshing={catalogRefreshing}
              onSearchChange={(value) => {
                setCatalogPage(1);
                setCatalogSearch(value);
              }}
              onFilterChange={(value) => {
                setCatalogPage(1);
                setSelectedCategoryId(null);
                setCatalogFilter(value);
              }}
              onCategoryChange={(categoryId) => {
                setSelectedCategoryId(categoryId);
                if (categoryId !== null) setCatalogFilter("products");
                setCatalogPage(1);
              }}
              onPageChange={setCatalogPage}
              onRefresh={() => void refreshCatalog()}
              onShowInfo={setCatalogInfoItem}
              onAdd={addToCart}
            />
          </main>
          <aside className="h-full min-h-0 lg:sticky lg:top-0 lg:self-start">
            <SaleTicket
              draftId={draftId}
              lineCount={cart.length + subscriptionCharges.length}
              hasTicketItems={hasTicketItems}
              submitting={submitting}
              onClear={() => setClearTicketOpen(true)}
            >
              <ScrollArea className="min-h-0 flex-1">
                <CardContent className="space-y-4 px-5 py-4">
                  {!hasTicketItems ? (
                    <div className="flex min-h-52 flex-col items-center justify-center text-center">
                      <div className="flex size-14 items-center justify-center rounded-2xl bg-slate-50 text-slate-300">
                        <ShoppingCart className="size-7" />
                      </div>
                      <p className="mt-4 text-sm font-semibold text-slate-700">
                        Tu ticket está vacío
                      </p>
                      <p className="mt-1 max-w-55 text-xs leading-relaxed text-slate-500">
                        Agrega productos o servicios desde el catálogo para
                        comenzar.
                      </p>
                      <span className="mt-3 text-[11px] text-slate-400">
                        Los borradores se guardan automáticamente
                      </span>
                    </div>
                  ) : (
                    <>
                      {subscriptionCharges.length > 0 && (
                        <div className="space-y-2 rounded-xl border border-amber-200 bg-amber-50/60 p-3">
                          <p className="text-xs font-semibold uppercase tracking-[0.12em] text-amber-800">
                            Cuotas de suscripción
                          </p>
                          {subscriptionCharges.map((charge) => (
                            <div key={`installment-${charge.id}`} className="flex items-center justify-between gap-3 text-sm">
                              <div>
                                <p className="font-semibold text-slate-800">Cuota #{charge.id}</p>
                                <p className="text-[11px] text-slate-500">Vence {dateTime(charge.dueDate)}</p>
                              </div>
                              <span className="font-bold text-slate-900">{money(charge.totalAmount)}</span>
                            </div>
                          ))}
                        </div>
                      )}
                      <CartLineList items={cart} formatMoney={money} onQuantityChange={updateQuantity} />
                      {paymentsOpen && <PaymentPanel
                        lines={paymentLines}
                        paymentLabels={paymentLabels}
                        total={total}
                        change={change}
                        paymentReceived={paymentReceived}
                        pendingBalance={pendingBalance}
                        overpayment={overpayment}
                        isCash={isCash}
                        formatMoney={money}
                        onAddPayment={addPayment}
                        onMethodChange={(index, method) => setPaymentLines((current) => current.map((line, lineIndex) => lineIndex === index ? { ...line, method } : line))}
                        onAmountChange={(index, amount) => index === 0 ? setCashAmount(amount) : setPaymentLines((current) => current.map((line, lineIndex) => lineIndex === index ? { ...line, amount } : line))}
                        onRemovePayment={removePayment}
                      />}
                    </>
                  )}
              </CardContent>
              </ScrollArea>
              <div className="shrink-0 border-t border-slate-100 bg-white px-4 py-2">
                <div className="flex gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="h-8 flex-1 px-2 text-xs"
                    onClick={() => setDiscountOpen((open) => !open)}
                  >
                    <Percent className="mr-1.5 size-3.5" />
                    Descuentos
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="h-8 flex-1 px-2 text-xs"
                    onClick={() => setPaymentsOpen((open) => !open)}
                  >
                    <CreditCard className="mr-1.5 size-3.5" />
                    Pagos
                  </Button>
                </div>
              </div>
              <TicketSummary subtotal={subtotal} tax={tax} total={total} discountOpen={discountOpen} discountRate={discountRate} formatMoney={money} onDiscountRateChange={setDiscountRate} />
              <TicketActions
                canCheckout={hasTicketItems && !hasInsufficientStock}
                canHold={hasTicketItems}
                submitting={submitting}
                printing={printing}
                waitingLoading={waitingLoading}
                printError={printError}
                onCheckout={() => void handleCheckout()}
                onHold={() => void handleHold()}
                onRefreshWaiting={() => void refreshWaiting()}
                onDismissPrintError={() => setPrintError(null)}
              />
            </SaleTicket>
          </aside>
        </div>
        <footer className="mt-4 flex flex-wrap items-center justify-between gap-2 px-1 text-[11px] text-slate-400">
          <span>F2 buscar · F6 cuentas en espera · F8 cobrar</span>
          <span>
            {draftSaveInFlight
              ? "Guardando borrador..."
              : draftId
                ? `Borrador #${draftId} guardado`
                : "Listo para operar"}
          </span>
        </footer>
      </div>
      <CatalogInfoDialog item={catalogInfoItem} formatMoney={money} onClose={() => setCatalogInfoItem(null)} />
      <VariablePriceDialog
        product={variableProduct}
        price={variablePrice}
        taxPreview={variablePriceAmounts ? {
          net: (variablePriceAmounts.netCents as number) / 100,
          tax: (variablePriceAmounts.taxCents as number) / 100,
        } : null}
        formatMoney={money}
        onOpenChange={(open) => !open && setVariableProduct(null)}
        onPriceChange={setVariablePrice}
        onEnter={confirmVariableProduct}
        onConfirm={confirmVariableProduct}
      />
      <ClientPickerDialog
        open={clientOpen}
        query={clientSearch}
        clients={filteredClients}
        selectedClientId={selectedClientId}
        onOpenChange={setClientOpen}
        onQueryChange={setClientSearch}
        onSelect={(clientId) => void selectClient(clientId)}
      />
      <WaitingSaleAlerts
        matchingOpen={matchingWaitingOpen}
        matchingSale={matchingWaitingSale}
        cancelSale={cancelSale}
        replaceOpen={replaceCartOpen}
        onMatchingOpenChange={(open) => {
          if (!open) {
            setMatchingWaitingOpen(false);
            setMatchingWaitingSale(null);
          }
        }}
        onKeepNewSale={keepNewSale}
        onContinueMatching={() => void continueMatchingWaiting()}
        onCancelSaleChange={setCancelSale}
        onCancelWaiting={(sale) => void cancelWaiting(sale)}
        onReplaceOpenChange={setReplaceCartOpen}
        onReplaceAndContinue={() => void replaceAndContinue()}
      />
      <InstallmentPickerDialog
        open={installmentOpen}
        installments={availableInstallments}
        selectedIds={selectedInstallmentIds}
        preparing={installmentPreparing}
        formatDateTime={dateTime}
        formatMoney={money}
        onOpenChange={setInstallmentOpen}
        onToggle={toggleInstallment}
        onConfirm={() => void loadInstallmentsInTicket()}
      />
      <WaitingSalesDialog
        open={waitingOpen}
        sales={waitingSales}
        loading={waitingLoading}
        formatDateTime={dateTime}
        formatMoney={money}
        onOpenChange={setWaitingOpen}
        onRefresh={() => void refreshWaiting()}
        onContinue={(sale) => void continueWaiting(sale)}
        onCancel={setCancelSale}
      />
      <ClearTicketDialog
        open={clearTicketOpen}
        onOpenChange={setClearTicketOpen}
        onConfirm={() => {
          clearTicket();
          setClearTicketOpen(false);
        }}
      />
    </div>
  );
}
