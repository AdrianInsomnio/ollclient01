'use client'
// pagina para manejar invaentario de productos y servicios
import { useState } from "react"


export default function UserInventarioPage() {
  const [searchTerm, setSearchTerm] = useState("")
  
  return (<div className="space-y-6">
    <div className="flex items-center justify-between">
      <h1 className="text-2xl font-bold">Inventario</h1>
      <div className="flex items-center gap-2">
        <input
          type="text"
          placeholder="Buscar producto o servicio..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="border rounded px-2 py-1"
        />
      </div>
    </div>

    <p>Resultados de búsqueda para: {searchTerm}</p>
  </div>)
}   
