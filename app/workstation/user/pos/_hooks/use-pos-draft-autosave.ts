import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { createDraftSale, updateSale } from "@/lib/api/sales";
import type { Product } from "@/lib/api/products";
import type { PosCartItem } from "../_components/cart-line-list";

type DraftClient = { id: string; name: string };

export function usePosDraftAutosave({
  clients,
  selectedClientId,
  cart,
  submitting,
  hasInsufficientStock,
  discountRate,
  checkoutInFlightRef,
}: {
  clients: DraftClient[];
  selectedClientId: string | null;
  cart: PosCartItem[];
  submitting: boolean;
  hasInsufficientStock: boolean;
  discountRate: string;
  checkoutInFlightRef: { current: boolean };
}) {
  const [draftId, setDraftId] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const draftIdRef = useRef<string | null>(null);
  const saveTimerRef = useRef<number | null>(null);
  const saveInFlightRef = useRef(false);
  const savePromiseRef = useRef<Promise<void> | null>(null);
  const autosavePausedRef = useRef(false);

  const cancelScheduledSave = () => {
    if (saveTimerRef.current !== null) {
      window.clearTimeout(saveTimerRef.current);
      saveTimerRef.current = null;
    }
  };
  const waitForPendingSave = async () => {
    if (savePromiseRef.current) await savePromiseRef.current;
  };

  useEffect(() => {
    const genericClient = clients.find(
      (client) => client.name.trim().toLowerCase() === "consumidor final",
    );
    const activeClientId =
      selectedClientId ?? (genericClient ? String(genericClient.id) : null);
    if (
      !activeClientId ||
      cart.length === 0 ||
      submitting ||
      autosavePausedRef.current ||
      saveInFlightRef.current ||
      cart.some(
        (entry) =>
          entry.itemType === "product" &&
          (entry.item as Product).priceType !== "VARIABLE" &&
          entry.quantity > (entry.item as Product).stock,
      )
    ) {
      return;
    }

    const timer = window.setTimeout(async () => {
      saveTimerRef.current = null;
      saveInFlightRef.current = true;
      setIsSaving(true);
      const savePromise = (async () => {
        const payload = {
          clientId: Number(activeClientId),
          items: cart.map((entry) => ({
            itemType: entry.itemType,
            itemId: entry.item.id,
            quantity: entry.quantity,
            ...(entry.itemType === "service" ||
            (entry.itemType === "product" && (entry.item as Product).priceType === "VARIABLE")
              ? {
                  nameSnapshot: entry.item.name,
                  priceSnapshot: entry.unitPrice ?? entry.item.price,
                }
              : {}),
          })),
          discount: Number(discountRate) || 0,
        };
        const draft = draftIdRef.current
          ? await updateSale(draftIdRef.current, payload)
          : await createDraftSale(payload);
        draftIdRef.current = String(draft.id);
        setDraftId(String(draft.id));
      })();
      savePromiseRef.current = savePromise;
      try {
        await savePromise;
      } catch (error) {
        if (!checkoutInFlightRef.current) {
          toast.error(
            error instanceof Error ? error.message : "No se pudo guardar el borrador.",
            { id: "pos-draft-save-error" },
          );
        }
      } finally {
        if (savePromiseRef.current === savePromise) {
          savePromiseRef.current = null;
        }
        saveInFlightRef.current = false;
        setIsSaving(false);
      }
    }, 700);
    saveTimerRef.current = timer;
    return () => {
      window.clearTimeout(timer);
      if (saveTimerRef.current === timer) {
        saveTimerRef.current = null;
      }
    };
  }, [
    cart,
    clients,
    discountRate,
    selectedClientId,
    submitting,
    hasInsufficientStock,
    checkoutInFlightRef,
  ]);

  return {
    draftId,
    setDraftId,
    draftIdRef,
    saveTimerRef,
    saveInFlightRef,
    savePromiseRef,
    autosavePausedRef,
    isSaving,
    cancelScheduledSave,
    waitForPendingSave,
  };
}
