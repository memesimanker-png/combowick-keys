import { Navigate } from "react-router-dom";

/** /keys now sends users straight into the free-key flow. */
export default function Keys() {
  return <Navigate to="/verify/provider-select" replace />;
}
