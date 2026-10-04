import { useRef, useState } from 'react'
import type { FormEvent } from 'react'
import { Alert, Button, Card, InputField, TextareaField } from './ui'
import {
  LIMITS, emptySection, hasErrors, parseSteps, todayIso, validateDraft,
} from '../editor/draft'
import type { ArticleDraft, DraftErrors, SectionDraft } from '../editor/draft'
import { messageFor } from '../lib/userFacingError'
import styles from './ArticleForm.module.css'

interface ArticleFormProps {
  initial: ArticleDraft
  /** Categorías que ya existen, para sugerirlas y evitar duplicados tipo "GPS" / "Gps". */
  categories: string[]
  submitLabel: string
  /** Debe lanzar un error si no se pudo guardar (se muestra en el formulario). */
  onSubmit: (draft: ArticleDraft) => Promise<void>
}

function moveItem<T>(items: T[], from: number, to: number): T[] {
  const copy = [...items]
  const [item] = copy.splice(from, 1)
  copy.splice(to, 0, item)
  return copy
}

export function ArticleForm({ initial, categories, submitLabel, onSubmit }: ArticleFormProps) {
  const [draft, setDraft] = useState<ArticleDraft>(initial)
  const [errors, setErrors] = useState<DraftErrors>({ bySection: {} })
  const [submitError, setSubmitError] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)
  const summaryRef = useRef<HTMLDivElement>(null)

  const setField = <K extends 'title' | 'category' | 'lastReviewedAt'>(field: K, value: string) =>
    setDraft((d) => ({ ...d, [field]: value }))

  const setSection = (key: string, patch: Partial<SectionDraft>) =>
    setDraft((d) => ({ ...d, sections: d.sections.map((s) => (s.key === key ? { ...s, ...patch } : s)) }))

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setSubmitError(null)

    const found = validateDraft(draft)
    setErrors(found)
    if (hasErrors(found)) {
      // Se lleva el foco al resumen para que lectores de pantalla y teclado vean que hay errores.
      requestAnimationFrame(() => summaryRef.current?.focus())
      return
    }

    setSaving(true)
    try {
      await onSubmit(draft)
    } catch (error) {
      setSubmitError(messageFor(error, 'No se pudo guardar el artículo. Inténtalo de nuevo.'))
      requestAnimationFrame(() => summaryRef.current?.focus())
    } finally {
      setSaving(false)
    }
  }

  const showSummary = hasErrors(errors) || submitError

  return (
    <form onSubmit={handleSubmit} noValidate className={styles.form}>
      <div ref={summaryRef} tabIndex={-1} className={styles.summary}>
        {submitError && (
          <Alert tone="danger" title="No se pudo guardar">
            {submitError}
          </Alert>
        )}
        {!submitError && showSummary && (
          <Alert tone="danger" title="Revisa los campos marcados">
            Hay datos que no cumplen los requisitos. Corrígelos y vuelve a guardar.
          </Alert>
        )}
      </div>

      <Card className={styles.card}>
        <InputField
          label="Título"
          hint="Redáctalo como el problema que contaría el cliente, por ejemplo «La batería dura poco»."
          value={draft.title}
          onChange={(e) => setField('title', e.target.value)}
          error={errors.title}
          maxLength={LIMITS.title.max}
        />

        <InputField
          label="Categoría"
          hint="Elige una existente o escribe una nueva."
          list="categorias-existentes"
          value={draft.category}
          onChange={(e) => setField('category', e.target.value)}
          error={errors.category}
          maxLength={LIMITS.category.max}
        />
        <datalist id="categorias-existentes">
          {categories.map((c) => (
            <option key={c} value={c} />
          ))}
        </datalist>

        <div className={styles.dateRow}>
          <InputField
            label="Fecha de última revisión"
            type="date"
            value={draft.lastReviewedAt}
            max={todayIso()}
            onChange={(e) => setField('lastReviewedAt', e.target.value)}
            error={errors.lastReviewedAt}
          />
          <Button variant="secondary" onClick={() => setField('lastReviewedAt', todayIso())}>
            Poner hoy
          </Button>
        </div>
      </Card>

      <fieldset className={styles.sections}>
        <legend className={styles.legend}>Secciones</legend>
        <p className={styles.help}>
          Cada sección es un fragmento que el asistente puede citar. Escribe solo texto sin formato: no se admite HTML.
        </p>
        {errors.sections && <Alert tone="danger">{errors.sections}</Alert>}

        {draft.sections.map((section, index) => {
          const e = errors.bySection[section.key] ?? {}
          const n = index + 1
          return (
            <Card key={section.key} className={styles.card} role="group" aria-label={`Sección ${n}`}>
              <div className={styles.sectionHeader}>
                <h3>Sección {n}</h3>
                <div className={styles.sectionActions}>
                  <Button
                    variant="secondary"
                    aria-label={`Subir la sección ${n}`}
                    disabled={index === 0}
                    onClick={() => setDraft((d) => ({ ...d, sections: moveItem(d.sections, index, index - 1) }))}
                  >
                    ↑
                  </Button>
                  <Button
                    variant="secondary"
                    aria-label={`Bajar la sección ${n}`}
                    disabled={index === draft.sections.length - 1}
                    onClick={() => setDraft((d) => ({ ...d, sections: moveItem(d.sections, index, index + 1) }))}
                  >
                    ↓
                  </Button>
                  <Button
                    variant="danger"
                    aria-label={`Quitar la sección ${n}`}
                    disabled={draft.sections.length <= LIMITS.sections.min}
                    onClick={() => setDraft((d) => ({ ...d, sections: d.sections.filter((s) => s.key !== section.key) }))}
                  >
                    Quitar
                  </Button>
                </div>
              </div>

              {e.general && <Alert tone="danger">{e.general}</Alert>}

              <InputField
                label={`Encabezado de la sección ${n}`}
                hint="Por ejemplo «Qué ocurre», «Qué comprobar primero» o «Si sigue fallando»."
                value={section.heading}
                onChange={(ev) => setSection(section.key, { heading: ev.target.value })}
                error={e.heading}
                maxLength={LIMITS.heading.max}
              />
              <TextareaField
                label={`Texto de la sección ${n} (opcional)`}
                value={section.body}
                onChange={(ev) => setSection(section.key, { body: ev.target.value })}
                error={e.body}
                maxLength={LIMITS.body.max}
                rows={3}
              />
              <TextareaField
                label={`Pasos de la sección ${n} (opcional)`}
                hint="Un paso por línea. Se numeran solos al mostrarlos."
                value={section.stepsText}
                onChange={(ev) => setSection(section.key, { stepsText: ev.target.value })}
                error={e.steps}
                rows={5}
              />
              <p className={styles.counter}>{parseSteps(section.stepsText).length} pasos</p>
            </Card>
          )
        })}

        <Button
          variant="secondary"
          disabled={draft.sections.length >= LIMITS.sections.max}
          onClick={() => setDraft((d) => ({ ...d, sections: [...d.sections, emptySection()] }))}
        >
          Añadir sección
        </Button>
      </fieldset>

      <div className={styles.actions}>
        <Button type="submit" disabled={saving}>
          {saving ? 'Guardando…' : submitLabel}
        </Button>
      </div>
    </form>
  )
}
