import { writable } from "svelte/store";

export function localStorageStore<T>(key: string, value: T) {
  const init = localStorage.getItem(key);
  const store = writable(init ? JSON.parse(init) : value);

  store.subscribe(value => {
    localStorage.setItem(key, JSON.stringify(value));
  });

  return store;
}
