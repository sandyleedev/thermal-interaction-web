import type { ReactNode } from "react";
import {
  BodyMapAreaViewLoadingScope,
  useBodyMapAreaViewLoadingReporter,
} from "./BodyMapAreaViewLoadingScope";

type BodyMapAreaViewLoadingOverlayProps = {
  visible: boolean;
  label?: string;
  children: ReactNode;
};

/** Single-map wrapper: one scope + one loading reporter. */
export function BodyMapAreaViewLoadingOverlay({
  visible,
  label,
  children,
}: BodyMapAreaViewLoadingOverlayProps) {
  return (
    <BodyMapAreaViewLoadingScope label={label}>
      <BodyMapAreaViewLoadingReporter loading={visible} />
      {children}
    </BodyMapAreaViewLoadingScope>
  );
}

function BodyMapAreaViewLoadingReporter({ loading }: { loading: boolean }) {
  useBodyMapAreaViewLoadingReporter("overlay", loading);
  return null;
}
