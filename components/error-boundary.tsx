"use client"

import React, { Component, ErrorInfo, ReactNode } from "react"
import { AlertTriangle } from "lucide-react"

interface Props {
  children?: ReactNode
  fallback?: ReactNode
}

interface State {
  hasError: boolean
}

export class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false
  }

  public static getDerivedStateFromError(): State {
    return { hasError: true }
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error("Uncaught error:", error, errorInfo)
  }

  public render() {
    if (this.state.hasError) {
      return this.props.fallback || (
        <div className="flex h-full w-full flex-col items-center justify-center gap-2 rounded-lg border border-red-500/20 bg-red-500/10 p-6 text-red-500">
          <AlertTriangle className="h-8 w-8" />
          <p className="text-sm font-medium">Error al cargar el visor 3D.</p>
        </div>
      )
    }

    return this.props.children
  }
}
