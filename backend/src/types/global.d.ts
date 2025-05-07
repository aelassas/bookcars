// Google Maps types
interface Window {
  google: {
    maps: {
      Map: typeof google.maps.Map
      Marker: typeof google.maps.Marker
      InfoWindow: typeof google.maps.InfoWindow
      LatLng: typeof google.maps.LatLng
      Geocoder: typeof google.maps.Geocoder
      GeocoderStatus: {
        OK: string
        ZERO_RESULTS: string
        OVER_QUERY_LIMIT: string
        REQUEST_DENIED: string
        INVALID_REQUEST: string
        UNKNOWN_ERROR: string
      }
      places: {
        Autocomplete: typeof google.maps.places.Autocomplete
        AutocompleteService: typeof google.maps.places.AutocompleteService
        PlacesServiceStatus: typeof google.maps.places.PlacesServiceStatus
        PlaceResult: typeof google.maps.places.PlaceResult
      }
      ControlPosition: typeof google.maps.ControlPosition
      MapTypeId: typeof google.maps.MapTypeId
      Animation: {
        DROP: number;
        BOUNCE: number;
      }
      MapMouseEvent: google.maps.MapMouseEvent
      event: {
        addListener: (instance: any, eventName: string, handler: Function) => void;
        trigger: (instance: any, eventName: string) => void;
      }
    }
  }
  initAutocomplete?: () => void
}

// Google Maps namespace
declare namespace google.maps {
  class Map {
    constructor(mapDiv: Element, options?: MapOptions);
    setCenter(latLng: LatLng | LatLngLiteral): void;
    setZoom(zoom: number): void;
    fitBounds(bounds: LatLngBounds | LatLngBoundsLiteral): void;
    setOptions(options: MapOptions): void;
    controls: Array<MVCArray<Node>>;
    addListener(eventName: string, handler: Function): MapsEventListener;
  }

  class Marker {
    constructor(opts?: MarkerOptions);
    setMap(map: Map | null): void;
    setPosition(latLng: LatLng | LatLngLiteral): void;
    getPosition(): LatLng;
    addListener(eventName: string, handler: Function): MapsEventListener;
  }

  class Geocoder {
    constructor();
    geocode(
      request: {
        address?: string;
        location?: LatLng | LatLngLiteral;
        placeId?: string;
        bounds?: LatLngBounds | LatLngBoundsLiteral;
        componentRestrictions?: GeocoderComponentRestrictions;
        region?: string;
      },
      callback: (
        results: GeocoderResult[],
        status: string
      ) => void
    ): void;
  }

  interface GeocoderResult {
    address_components: GeocoderAddressComponent[];
    formatted_address: string;
    geometry: {
      location: LatLng;
      location_type: string;
      viewport: LatLngBounds;
      bounds?: LatLngBounds;
    };
    place_id: string;
    plus_code?: {
      compound_code: string;
      global_code: string;
    };
    types: string[];
  }

  interface GeocoderAddressComponent {
    long_name: string;
    short_name: string;
    types: string[];
  }

  interface GeocoderComponentRestrictions {
    country: string | string[];
  }

  interface MapOptions {
    center?: LatLng | LatLngLiteral;
    zoom?: number;
    mapTypeId?: string;
    mapTypeControl?: boolean;
    streetViewControl?: boolean;
    fullscreenControl?: boolean;
    zoomControl?: boolean;
    rotateControl?: boolean;
    scaleControl?: boolean;
  }

  interface MarkerOptions {
    position?: LatLng | LatLngLiteral;
    map?: Map;
    animation?: number;
    draggable?: boolean;
    title?: string;
  }

  interface MapMouseEvent {
    latLng?: LatLng;
  }

  interface LatLng {
    lat(): number;
    lng(): number;
  }

  interface LatLngLiteral {
    lat: number;
    lng: number;
  }

  interface LatLngBounds {
    extend(latLng: LatLng | LatLngLiteral): LatLngBounds;
    getCenter(): LatLng;
  }

  interface LatLngBoundsLiteral {
    east: number;
    north: number;
    south: number;
    west: number;
  }

  interface MapsEventListener {
    remove(): void;
  }

  interface MVCArray<T> {
    clear(): void;
    getArray(): Array<T>;
    getAt(i: number): T;
    getLength(): number;
    insertAt(i: number, elem: T): void;
    pop(): T;
    push(elem: T): number;
    removeAt(i: number): T;
    setAt(i: number, elem: T): void;
  }
}

declare namespace google.maps.places {
  class Autocomplete {
    constructor(
      inputElement: HTMLInputElement,
      options?: AutocompleteOptions
    );
    addListener(eventName: string, handler: () => void): void;
    getPlace(): PlaceResult;
    bindTo(bindKey: string, target: any): void;
    unbind(bindKey: string): void;
    setBounds(bounds: google.maps.LatLngBounds | google.maps.LatLngBoundsLiteral): void;
    setOptions(options: AutocompleteOptions): void;
    setTypes(types: string[]): void;
  }

  interface AutocompleteOptions {
    bounds?: google.maps.LatLngBounds | google.maps.LatLngBoundsLiteral;
    componentRestrictions?: { country: string | string[] };
    fields?: string[];
    strictBounds?: boolean;
    types?: string[];
  }

  interface PlaceResult {
    formatted_address?: string;
    geometry?: {
      location: google.maps.LatLng;
      viewport?: google.maps.LatLngBounds;
    };
    name?: string;
    address_components?: Array<{
      long_name: string;
      short_name: string;
      types: string[];
    }>;
    photos?: Array<PlacePhoto>;
    place_id?: string;
    types?: string[];
    vicinity?: string;
  }

  interface PlacePhoto {
    getUrl(opts: PhotoOptions): string;
    height: number;
    width: number;
    html_attributions: string[];
  }

  interface PhotoOptions {
    maxHeight?: number;
    maxWidth?: number;
  }
} 
