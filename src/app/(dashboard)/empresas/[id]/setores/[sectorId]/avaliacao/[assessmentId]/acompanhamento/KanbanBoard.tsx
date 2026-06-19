'use client'

import { useState, useCallback, useTransition, useRef } from 'react'
import {
  DndContext,
  DragEndEvent,
  DragOverEvent,
  DragOverlay,
  DragStartEvent,
  MouseSensor,
  TouchSensor,
  useSensor,
  useSensors,
  useDroppable,
  useDraggable,
  closestCenter,
} from '@dnd-kit/core'
import { RiskBadge } from '@/components/features/RiskBadge'
import { updateActionStatus } from '@/app/actions/tracking'
import { uploadEvidence, deleteEvidence, getEvidences } from '@/app/actions/evidences'
import type { EvidenceRow } from '@/app/actions/evidences'
import type { KanbanAction } from './page'
import type { ActionStatus, RiskLevel } from '@/types/database'

// ─── Constantes ──────────────────────────────────────────────────────────────

const COLUMNS: { id: ActionStatus; label: string; colorClass: string; headerClass: string }[] = [
  { id: 'pendente',     label: 'Pendente',     colorClass: 'bg-gray-50 border-gray-200',  headerClass: 'bg-gray-100 text-gray-700'  },
  { id: 'em_andamento', label: 'Em Andamento', colorClass: 'bg-blue-50 border-blue-100',  headerClass: 'bg-blue-100 text-blue-800'  },
  { id: 'concluida',    label: 'Concluída',    colorClass: 'bg-green-50 border-green-100', headerClass: 'bg-green-100 text-green-800' },
  { id: 'atrasada',     label: 'Atrasada',     colorClass: 'bg-red-50 border-red-100',    headerClass: 'bg-red-100 text-red-800'    },
]

// ─── Painel de evidências ─────────────────────────────────────────────────────

function EvidencePanel({ actionId, onClose }: { actionId: string; onClose: () => void }) {
  const [evidences, setEvidences] = useState<EvidenceRow[] | null>(null)
  const [loading, setLoading] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [uploadError, setUploadError] = useState<string | null>(null)
  const fileRef = useRef<HTMLInputElement>(null)

  // Carrega evidências na primeira abertura
  useState(() => {
    getEvidences(actionId).then(list => setEvidences(list))
  })

  // Workaround: usa useCallback para carregar
  const load = useCallback(async () => {
    setLoading(true)
    const list = await getEvidences(actionId)
    setEvidences(list)
    setLoading(false)
  }, [actionId])

  // Carrega ao montar
  useState(() => { load() })

  async function handleUpload(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    const file = fileRef.current?.files?.[0]
    if (!file) return
    setUploading(true)
    setUploadError(null)
    const fd = new FormData()
    fd.append('file', file)
    const result = await uploadEvidence(actionId, fd)
    if (result.error) {
      setUploadError(result.error)
    } else if (result.evidence) {
      setEvidences(prev => [result.evidence!, ...(prev ?? [])])
      if (fileRef.current) fileRef.current.value = ''
    }
    setUploading(false)
  }

  async function handleDelete(evidenceId: string) {
    const result = await deleteEvidence(evidenceId)
    if (!result.error) {
      setEvidences(prev => (prev ?? []).filter(e => e.id !== evidenceId))
    }
  }

  function fileIcon(type: string) {
    if (type === 'application/pdf') return '📄'
    if (type.startsWith('image/')) return '🖼'
    return '📎'
  }

  return (
    <div className="mt-2 rounded-xl border border-blue-200 bg-blue-50 p-3">
      <div className="mb-2 flex items-center justify-between">
        <span className="text-xs font-semibold text-blue-800">Evidências</span>
        <button onClick={onClose} className="text-xs text-blue-500 hover:text-blue-700">fechar ×</button>
      </div>

      {/* Lista */}
      {loading && <p className="py-2 text-center text-xs text-gray-400">Carregando…</p>}
      {!loading && evidences?.length === 0 && (
        <p className="py-2 text-center text-xs text-gray-400">Nenhuma evidência anexada.</p>
      )}
      {!loading && (evidences ?? []).map(ev => (
        <div key={ev.id} className="mb-1.5 flex items-center gap-2 rounded-lg bg-white px-3 py-2 text-xs shadow-sm">
          <span>{fileIcon(ev.file_type)}</span>
          <a
            href={ev.file_url}
            target="_blank"
            rel="noopener noreferrer"
            className="flex-1 truncate font-medium text-blue-700 hover:underline"
          >
            {ev.file_name}
          </a>
          <span className="shrink-0 text-gray-400">
            {ev.created_at ? new Date(ev.created_at).toLocaleDateString('pt-BR') : ''}
          </span>
          <button
            onClick={() => handleDelete(ev.id)}
            className="shrink-0 text-red-400 hover:text-red-600"
            title="Remover evidência"
          >
            ×
          </button>
        </div>
      ))}

      {/* Upload */}
      <form onSubmit={handleUpload} className="mt-2 flex flex-col gap-1.5">
        {uploadError && <p className="text-xs text-red-600">{uploadError}</p>}
        <input
          ref={fileRef}
          type="file"
          accept=".pdf,.jpg,.jpeg,.png,.webp"
          required
          className="text-xs text-gray-600 file:mr-2 file:rounded-md file:border-0 file:bg-blue-100 file:px-2 file:py-1 file:text-xs file:font-medium file:text-blue-700"
        />
        <p className="text-xs text-gray-400">PDF, PNG, JPG · máx. 10 MB</p>
        <button
          type="submit"
          disabled={uploading}
          className="self-end rounded-lg bg-blue-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-blue-700 disabled:opacity-50"
        >
          {uploading ? 'Enviando…' : 'Anexar arquivo'}
        </button>
      </form>
    </div>
  )
}

// ─── Card arrastável ──────────────────────────────────────────────────────────

function DraggableCard({
  action,
  isOverlay = false,
  expandedId,
  onToggleExpand,
}: {
  action: KanbanAction
  isOverlay?: boolean
  expandedId: string | null
  onToggleExpand: (id: string) => void
}) {
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
    id: action.id,
    data: { action },
  })

  const today = new Date().toISOString().split('T')[0]
  const isOverdue = action.due_date && action.due_date < today && action.status !== 'concluida'
  const isExpanded = expandedId === action.id

  return (
    <div
      ref={setNodeRef}
      style={transform ? { transform: `translate3d(${transform.x}px, ${transform.y}px, 0)` } : undefined}
      className={`rounded-xl border bg-white shadow-sm transition-opacity select-none ${
        isDragging && !isOverlay ? 'opacity-30' : 'opacity-100'
      } ${isOverlay ? 'shadow-xl ring-2 ring-blue-400' : ''} ${
        action.risk_level === 'critico'
          ? 'border-l-4 border-l-red-500 border-gray-100'
          : action.risk_level === 'alto'
          ? 'border-l-4 border-l-orange-400 border-gray-100'
          : 'border-gray-100'
      }`}
    >
      {/* Área arrastável */}
      <div
        {...attributes}
        {...listeners}
        className="cursor-grab active:cursor-grabbing p-3"
      >
        <div className="mb-2 flex flex-wrap items-center gap-1.5">
          {action.risk_level && <RiskBadge level={action.risk_level} />}
          <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${
            action.type === 'corretiva' ? 'bg-red-100 text-red-700' : 'bg-blue-100 text-blue-700'
          }`}>
            {action.type}
          </span>
        </div>
        <p className="text-sm font-medium text-gray-800 line-clamp-2">{action.description}</p>
        <div className="mt-2 space-y-0.5">
          {action.responsible && (
            <p className="text-xs text-gray-500"><span className="font-medium">Resp:</span> {action.responsible}</p>
          )}
          {action.due_date && (
            <p className={`text-xs font-medium ${isOverdue ? 'text-red-600' : 'text-gray-500'}`}>
              {isOverdue ? '⚠ ' : ''}Prazo:{' '}
              {new Date(action.due_date + 'T00:00:00').toLocaleDateString('pt-BR')}
            </p>
          )}
          {action.factorName && (
            <p className="truncate text-xs text-gray-400">{action.factorName}</p>
          )}
        </div>
      </div>

      {/* Botão evidências — fora da área de drag */}
      {!isOverlay && (
        <div className="border-t border-gray-100 px-3 pb-2 pt-1">
          <button
            onPointerDown={e => e.stopPropagation()}
            onClick={e => { e.stopPropagation(); onToggleExpand(action.id) }}
            className="text-xs font-medium text-blue-600 hover:underline"
          >
            {isExpanded ? '▲ Fechar evidências' : '▼ Evidências'}
          </button>
        </div>
      )}

      {/* Painel de evidências */}
      {isExpanded && !isOverlay && (
        <div className="px-3 pb-3">
          <EvidencePanel actionId={action.id} onClose={() => onToggleExpand(action.id)} />
        </div>
      )}
    </div>
  )
}

// ─── Coluna droppável ────────────────────────────────────────────────────────

function DroppableColumn({
  column,
  actions,
  expandedId,
  onToggleExpand,
}: {
  column: typeof COLUMNS[0]
  actions: KanbanAction[]
  expandedId: string | null
  onToggleExpand: (id: string) => void
}) {
  const { setNodeRef, isOver } = useDroppable({ id: column.id })

  return (
    <div className="flex min-w-[240px] flex-1 flex-col">
      <div className={`mb-3 flex items-center justify-between rounded-lg px-3 py-2 ${column.headerClass}`}>
        <span className="text-sm font-semibold">{column.label}</span>
        <span className="rounded-full bg-white px-2 py-0.5 text-xs font-bold text-gray-600">
          {actions.length}
        </span>
      </div>
      <div
        ref={setNodeRef}
        className={`flex flex-1 flex-col gap-2 rounded-xl border-2 border-dashed p-2 min-h-[200px] transition-colors ${
          isOver ? 'border-blue-400 bg-blue-50' : `border-transparent ${column.colorClass}`
        }`}
      >
        {actions.map(action => (
          <DraggableCard
            key={action.id}
            action={action}
            expandedId={expandedId}
            onToggleExpand={onToggleExpand}
          />
        ))}
        {actions.length === 0 && (
          <div className="flex flex-1 items-center justify-center py-8">
            <p className="text-xs text-gray-400">Sem ações</p>
          </div>
        )}
      </div>
    </div>
  )
}

// ─── Board principal ─────────────────────────────────────────────────────────

interface Props {
  initialActions: KanbanAction[]
  assessmentId: string
  companyId: string
  sectorId: string
  planId: string
}

export function KanbanBoard({ initialActions }: Props) {
  const [actions, setActions] = useState<KanbanAction[]>(initialActions)
  const [activeAction, setActiveAction] = useState<KanbanAction | null>(null)
  const [filterLevel, setFilterLevel] = useState<RiskLevel | 'todos'>('todos')
  const [expandedId, setExpandedId] = useState<string | null>(null)

  const sensors = useSensors(
    useSensor(MouseSensor, { activationConstraint: { distance: 8 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 250, tolerance: 5 } }),
  )

  function handleToggleExpand(id: string) {
    setExpandedId(prev => (prev === id ? null : id))
  }

  function handleDragStart(event: DragStartEvent) {
    setExpandedId(null) // fecha painel ao arrastar
    const action = actions.find(a => a.id === event.active.id)
    setActiveAction(action ?? null)
  }

  function handleDragOver(event: DragOverEvent) {
    const { over } = event
    if (!over) return
    const newStatus = over.id as ActionStatus
    const actionId = event.active.id as string
    setActions(prev => prev.map(a => (a.id === actionId ? { ...a, status: newStatus } : a)))
  }

  const handleDragEnd = useCallback(async (event: DragEndEvent) => {
    const { active, over } = event
    setActiveAction(null)
    if (!over) return

    const actionId = active.id as string
    const newStatus = over.id as ActionStatus
    const prevStatus = initialActions.find(a => a.id === actionId)?.status ?? 'pendente'
    if (newStatus === prevStatus) return

    const result = await updateActionStatus(actionId, newStatus)
    if (result.error) {
      setActions(prev => prev.map(a => (a.id === actionId ? { ...a, status: prevStatus } : a)))
    }
  }, [initialActions])

  const RISK_LEVELS: (RiskLevel | 'todos')[] = ['todos', 'critico', 'alto', 'moderado', 'baixo']
  const RISK_FILTER_COLORS: Record<string, string> = {
    todos: 'bg-gray-700 text-white',
    critico: 'bg-red-600 text-white',
    alto: 'bg-orange-500 text-white',
    moderado: 'bg-yellow-500 text-white',
    baixo: 'bg-green-600 text-white',
  }

  const filtered = filterLevel === 'todos' ? actions : actions.filter(a => a.risk_level === filterLevel)
  const byStatus = (status: ActionStatus) => filtered.filter(a => a.status === status)

  return (
    <div className="flex flex-col gap-4">
      {/* Filtro por nível */}
      <div className="flex flex-wrap items-center gap-2">
        <span className="text-xs font-medium text-gray-500">Filtrar:</span>
        {RISK_LEVELS.map(level => (
          <button
            key={level}
            onClick={() => setFilterLevel(level)}
            className={`rounded-full px-3 py-1 text-xs font-semibold transition-all ${
              filterLevel === level
                ? RISK_FILTER_COLORS[level]
                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            }`}
          >
            {level === 'todos' ? 'Todos' : level.charAt(0).toUpperCase() + level.slice(1)}
          </button>
        ))}
      </div>

      {/* Colunas */}
      <DndContext
        sensors={sensors}
        collisionDetection={closestCenter}
        onDragStart={handleDragStart}
        onDragOver={handleDragOver}
        onDragEnd={handleDragEnd}
      >
        <div className="flex gap-4 overflow-x-auto pb-4">
          {COLUMNS.map(col => (
            <DroppableColumn
              key={col.id}
              column={col}
              actions={byStatus(col.id)}
              expandedId={expandedId}
              onToggleExpand={handleToggleExpand}
            />
          ))}
        </div>
        <DragOverlay>
          {activeAction && (
            <DraggableCard
              action={activeAction}
              isOverlay
              expandedId={null}
              onToggleExpand={() => {}}
            />
          )}
        </DragOverlay>
      </DndContext>
    </div>
  )
}
