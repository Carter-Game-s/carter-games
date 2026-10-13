"use client";
/* eslint-disable react-hooks/static-components */
import {
  Component,
  lazy,
  Suspense,
  useMemo,
  useEffect,
  useState,
  type ReactNode,
} from "react";
import type {
  NativeGameDefinition,
  GameRuntime,
  NativeGameComponent,
} from "@/games/types";
const cache = new Map<string, React.LazyExoticComponent<NativeGameComponent>>();
function selected(definition: NativeGameDefinition) {
  let component = cache.get(definition.metadata.slug);
  if (!component) {
    component = lazy(definition.load);
    cache.set(definition.metadata.slug, component);
  }
  return component;
}
class LoadBoundary extends Component<
  { children: ReactNode; retry: () => void },
  { failed: boolean }
> {
  state = { failed: false };
  static getDerivedStateFromError() {
    return { failed: true };
  }
  render() {
    return this.state.failed ? (
      <div className="error" role="alert">
        The game could not load.{" "}
        <button onClick={this.props.retry}>Retry loading</button>
      </div>
    ) : (
      this.props.children
    );
  }
}
export function NativeGameLoader({
  definition,
  runtime,
}: {
  definition: NativeGameDefinition;
  runtime: GameRuntime;
}) {
  const [attempt, setAttempt] = useState(0);
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  const Game = useMemo(() => {
    void attempt;
    return selected(definition);
  }, [definition, attempt]);
  if (!mounted)
    return (
      <div role="status" className="status">
        Loading {definition.metadata.title}…
      </div>
    );
  return (
    <LoadBoundary
      key={attempt}
      retry={() => {
        cache.delete(definition.metadata.slug);
        setAttempt((a) => a + 1);
      }}
    >
      <Suspense
        fallback={
          <div role="status" className="status">
            Loading {definition.metadata.title}…
          </div>
        }
      >
        <Game metadata={definition.metadata} runtime={runtime} />
      </Suspense>
    </LoadBoundary>
  );
}
