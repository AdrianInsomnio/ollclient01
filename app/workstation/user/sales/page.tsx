"use client";

import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { getSales } from "@/lib/api/sales";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Receipt, RefreshCcw } from "lucide-react";

function formatCurrency(value: number) {
  return new Intl.NumberFormat("es-UY", { style: "currency", currency: "UYU" }).format(value);
}

function formatDate(value?: string) {
  if (!value) return "-";
  return new Date(value).toLocaleString("es-UY");
}

export default function UserSalesPage() {
  const { data, isLoading, isError, error, refetch, isFetching } = useQuery({
    queryKey: ["sales"],
    queryFn: () => getSales(),
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Ventas</h1>
        <div className="flex items-center gap-2">
          <Link href="/workstation/user/pos">
            <Button><Receipt className="h-4 w-4 mr-2" />Nueva venta (POS)</Button>
          </Link>
          <Button variant="outline" onClick={() => refetch()} disabled={isFetching}>
            <RefreshCcw className="h-4 w-4 mr-2" />
            {isFetching ? "Actualizando..." : "Actualizar"}
          </Button>
        </div>
      </div>

      {isLoading ? (
        <p className="text-center text-gray-500 py-8">Cargando ventas...</p>
      ) : isError ? (
        <div className="p-4 bg-red-50 text-red-700 rounded">
          Error al cargar ventas: {(error as any)?.message ?? "desconocido"}
        </div>
      ) : !data || data.length === 0 ? (
        <p className="text-center text-gray-500 py-8">Aún no hay ventas registradas.</p>
      ) : (
        <Card>
          <CardHeader>
            <CardTitle>Historial de ventas</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-left border-b">
                    <th className="py-2 pr-4">ID</th>
                    <th className="py-2 pr-4">Fecha</th>
                    <th className="py-2 pr-4">Cliente</th>
                    <th className="py-2 pr-4">Items</th>
                    <th className="py-2 pr-4">Pago</th>
                    <th className="py-2 pr-4 text-right">Total</th>
                    <th className="py-2 pr-4">Estado</th>
                  </tr>
                </thead>
                <tbody>
                  {data.map((sale) => (
                    <tr key={sale.id} className="border-b last:border-0">
                      <td className="py-2 pr-4 font-mono text-xs">{sale.id}</td>
                      <td className="py-2 pr-4">{formatDate(sale.createdAt)}</td>
                      <td className="py-2 pr-4">{sale.client?.name ?? `Cliente #${sale.clientId}`}</td>
                      <td className="py-2 pr-4">{sale.items?.length ?? 0}</td>
                      <td className="py-2 pr-4">{sale.paymentMethod ?? "-"}</td>
                      <td className="py-2 pr-4 text-right font-medium">{formatCurrency(sale.total)}</td>
                      <td className="py-2 pr-4">
                        <span
                          className={`px-2 py-0.5 text-xs rounded-full ${
                            sale.status === "completed"
                              ? "bg-green-100 text-green-800"
                              : sale.status === "pending"
                              ? "bg-yellow-100 text-yellow-800"
                              : "bg-red-100 text-red-800"
                          }`}
                        >
                          {sale.status}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
