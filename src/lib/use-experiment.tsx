"use client"
import { useEffect, useRef, useState } from 'react'
import { getAssignment, logExperimentExposure, type ExperimentKey, type AssignmentResult } from './experiments'

// TODO(skeleton): subjectId 取得方法を集約 (user id / anon id)
function getSubjectId(): string {
  if (typeof window === 'undefined') return 'server'
  try {
    const LS_KEY = 'ab_subject_id'
    let id = localStorage.getItem(LS_KEY)
    if (!id) {
      id = 'u_' + Math.random().toString(36).slice(2, 10)
      localStorage.setItem(LS_KEY, id)
    }
    return id
  } catch {
    return 'anon'
  }
}

export function useExperiment(key: ExperimentKey) {
  const [assignment, setAssignment] = useState<AssignmentResult | null>(null)
  const exposedRef = useRef(false)

  useEffect(()=> {
    const subject = getSubjectId()
    const res = getAssignment(key, subject)
    setAssignment(res)
  }, [key])

  useEffect(()=> {
    if (!assignment || exposedRef.current) return
    if (typeof window !== 'undefined') {
      // Detect override by matching query param
      const params = new URLSearchParams(window.location.search)
      const overrideParam = 'exp.' + assignment.key
      if (params.has(overrideParam)) {
        const ov = params.get(overrideParam)
        if (ov === assignment.variant) {
          console.info(`[experiment] override applied: ${assignment.key} -> ${ov}`)
        }
      }
    }
    logExperimentExposure(assignment)
    exposedRef.current = true
  }, [assignment])

  return assignment
}
