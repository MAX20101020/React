export function parseJwt(token: string): Record<string, unknown> | null {
    try {
      const base64Url = token.split(".")[1];
      const base64 = base64Url.replace(/-/g, "+").replace(/_/g, "/");
      const jsonPayload = decodeURIComponent(
        atob(base64)
          .split("")
          .map((c) => "%" + ("00" + c.charCodeAt(0).toString(16)).slice(-2))
          .join("")
      );
  
      return JSON.parse(jsonPayload);
    } catch {
      return null;
    }
  }
  
  export function isAdminToken(token: string | null): boolean {
    if (!token) return false;
  
    const payload = parseJwt(token);
    if (!payload) return false;
  
    const roles =
      payload.role ||
      payload.roles ||
      payload["http://schemas.microsoft.com/ws/2008/06/identity/claims/role"];
  
    if (!roles) return false;
  
    const list = Array.isArray(roles) ? roles : [roles];
    return list.some((r) => String(r).trim().toLowerCase() === "admin");
  }
  
  export function isClientToken(token: string | null): boolean {
    return !!token && !isAdminToken(token);
  }