import { PetForm } from '@/components/pets/pet-form'

export default function NewPetPage() {
  return (
    <div className='space-y-6'>
      <h1 className='text-2xl font-bold'>Nueva Mascota</h1>
      <PetForm />
    </div>
  )
}
