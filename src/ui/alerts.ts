export function showAlert(message: string): void {
  window.alert(message);
}

export function askConfirm(message: string): boolean {
  return window.confirm(message);
}