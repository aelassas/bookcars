declare global {
  namespace setInterval {
    function setInterval(callback: () => void, ms?: number | undefined): NodeJS.Timeout
  }
  namespace setTimeout {
    function setTimeout(callback: () => void, ms?: number | undefined): NodeJS.Timeout
  }
}
