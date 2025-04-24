// Google Maps types
interface Window {
  google?: {
    maps?: {
      places?: {
        Autocomplete: new (
          inputElement: HTMLInputElement,
          options?: {
            fields?: string[]
          }
        ) => google.maps.places.Autocomplete
      }
    }
  }
  initAutocomplete?: () => void
}

// Google Maps namespace
declare namespace google.maps.places {
  class Autocomplete {
    constructor(
      inputElement: HTMLInputElement,
      options?: {
        fields?: string[]
      }
    )
    addListener(eventName: string, handler: () => void): void
    getPlace(): Place
  }

  interface Place {
    formatted_address?: string
    geometry?: {
      location: {
        lat: () => number
        lng: () => number
      }
    }
  }
} 