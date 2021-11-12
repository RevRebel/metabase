import { useEffect } from "react";
import querystring from "querystring";

export function useSyncedQueryString(
  fn: () => Record<string, any>,
  deps?: any[],
) {
  useEffect(() => {
    const object = fn();
    const searchString = buildSearchString(object);

    if (searchString !== window.location.search) {
      history.replaceState(
        null,
        document.title,
        window.location.pathname + searchString + window.location.hash,
      );
    }
    // exhaustive-deps is enabled for useSyncedQueryString so we don't need to include `fn` as a dependency
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [deps]);
}

function buildSearchString(object: Record<string, any>) {
  const search = querystring.stringify(object);
  return search ? `?${search}` : "";
}
