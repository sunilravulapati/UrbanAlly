import React, { useRef, useEffect, useState } from 'react';
import { Loader } from '@googlemaps/js-api-loader';
import { useParams } from 'react-router-dom';
import { FiMapPin, FiSearch, FiStar, FiArrowLeft, FiSave, FiTrash2 } from 'react-icons/fi';
import './MapPage.css';

function MapPage() {
  const { initialMode } = useParams();
  
  const mapRef = useRef(null);
  const startInputRef = useRef(null);
  const endInputRef = useRef(null);
  const isInitialized = useRef(false);
  const dangerZoneCirclesRef = useRef([]);

  const [appMode, setAppMode] = useState(initialMode || 'choice');
  const [map, setMap] = useState(null);
  const [directionsRenderer, setDirectionsRenderer] = useState(null);
  const [startPlace, setStartPlace] = useState(null);
  const [endPlace, setEndPlace] = useState(null);
  const [userLocation, setUserLocation] = useState(null);
  const [statusMessage, setStatusMessage] = useState("Welcome to Urban Ally!");
  const [savedRoutes, setSavedRoutes] = useState([]);
  const [currentRouteInfo, setCurrentRouteInfo] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [dynamicDangerZones, setDynamicDangerZones] = useState([]);

  useEffect(() => {
    const routesFromStorage = JSON.parse(localStorage.getItem('savedUrbanAllyRoutes')) || [];
    setSavedRoutes(routesFromStorage);
    if (isInitialized.current) return;
    isInitialized.current = true;
    
    const loader = new Loader({
      apiKey: import.meta.env.VITE_Maps_API_KEY,
      version: "weekly",
      libraries: ["places", "routes", "marker", "geometry"],
    });

    const fetchSafetyData = async () => {
      try {
        const response = await fetch('https://gist.githubusercontent.com/sunilravulapati/1862523d06197176d75150c266a256d0/raw/safety-incidents-secunderabad.json');
        if (!response.ok) throw new Error('Network response was not ok');
        const data = await response.json();
        setDynamicDangerZones(data);
      } catch (error) {
        console.error("Failed to fetch safety data:", error);
      }
    };

    loader.load().then(() => {
      fetchSafetyData();
      const initialMap = new google.maps.Map(mapRef.current, {
        center: { lat: 17.4399, lng: 78.4983 },
        zoom: 12,
        mapId: import.meta.env.VITE_MAP_ID,
        disableDefaultUI: true,
      });
      setMap(initialMap);
      setDirectionsRenderer(new google.maps.DirectionsRenderer({ map: initialMap, suppressMarkers: true }));
    });
  }, []);

  useEffect(() => {
    if (!map || dynamicDangerZones.length === 0) return;
    dangerZoneCirclesRef.current.forEach(circle => circle.setMap(null));
    dangerZoneCirclesRef.current = [];

    dynamicDangerZones.forEach(zone => {
      const circle = new google.maps.Circle({
        strokeColor: "#FF0000",
        strokeOpacity: 0.8,
        strokeWeight: 2,
        fillColor: "#FF0000",
        fillOpacity: 0.35,
        map,
        center: { lat: zone.lat, lng: zone.lng },
        radius: zone.radius,
      });
      dangerZoneCirclesRef.current.push(circle);
    });
  }, [dynamicDangerZones, map]);

  useEffect(() => {
    if (!map) return;
    if (directionsRenderer) directionsRenderer.setMap(null);
    setStartPlace(null);
    setEndPlace(null);
    setCurrentRouteInfo(null);

    const setupAutocomplete = (inputRef, onPlaceChanged) => {
      if (inputRef.current) {
        const autocomplete = new google.maps.places.Autocomplete(inputRef.current, { fields: ["geometry", "name"] });
        google.maps.event.clearInstanceListeners(inputRef.current);
        autocomplete.addListener("place_changed", () => onPlaceChanged(autocomplete.getPlace()));
      }
    };

    if (appMode === 'distanceChecker') {
      setupAutocomplete(startInputRef, setStartPlace);
      setupAutocomplete(endInputRef, setEndPlace);
      setStatusMessage("Enter a start and end location.");
      startInputRef.current?.focus();
    }

    if (appMode === 'safeRoute') {
      setupAutocomplete(endInputRef, setEndPlace);
      endInputRef.current?.focus();
      if (navigator.geolocation) {
        setIsLoading(true);
        setStatusMessage("Detecting your location...");
        navigator.geolocation.getCurrentPosition(
          (position) => {
            const pos = { lat: position.coords.latitude, lng: position.coords.longitude };
            map.setCenter(pos);
            map.setZoom(15);
            setUserLocation(pos);
            const markerEl = document.createElement('div');
            markerEl.className = 'user-location-marker';
            new google.maps.marker.AdvancedMarkerElement({ map, position: pos, content: markerEl });
            setStatusMessage("Location found! Please enter a destination.");
            setIsLoading(false);
          }, () => {
            setStatusMessage("Location access denied.");
            setIsLoading(false);
          }
        );
      }
    }
  }, [appMode, map]);

  const handleDistanceCheck = () => {
    if (!startPlace || !endPlace || !directionsRenderer) return;
    setIsLoading(true);
    setStatusMessage("Calculating distance...");
    directionsRenderer.setMap(map);
    new google.maps.DirectionsService().route({
      origin: startPlace.geometry.location,
      destination: endPlace.geometry.location,
      travelMode: google.maps.TravelMode.DRIVING,
    }, (response, status) => {
      if (status === "OK" && response.routes && response.routes.length > 0) {
        directionsRenderer.setDirections(response);
        map.fitBounds(response.routes[0].bounds);
        const route = response.routes[0].legs[0];
        setStatusMessage(`Distance: ${route.distance.text}. Duration: ${route.duration.text}.`);
      } else {
        setStatusMessage("Could not calculate the route.");
      }
      setIsLoading(false);
    });
  };
  
  const handleFindSafestRoute = () => {
    if (!userLocation || !endPlace || !directionsRenderer) return;
    setIsLoading(true);
    setStatusMessage("Calculating safest route...");
    directionsRenderer.setMap(map);
    const directionsService = new google.maps.DirectionsService();

    directionsService.route({
      origin: userLocation,
      destination: endPlace.geometry.location,
      travelMode: google.maps.TravelMode.WALKING,
      provideRouteAlternatives: true,
    }, (response, status) => {
      if (status === "OK" && response.routes && response.routes.length > 0) {
        let safestRoute = null, routeIndex = -1;
        for (let i = 0; i < response.routes.length; i++) {
          const route = response.routes[i];
          let isSafe = true;
          for (const zone of dynamicDangerZones) {
            const zoneCenter = new google.maps.LatLng(zone.lat, zone.lng);
            if (route.overview_path.some(point => 
                google.maps.geometry.spherical.computeDistanceBetween(point, zoneCenter) < zone.radius
            )) {
              isSafe = false;
              break;
            }
          }
          if (isSafe) { safestRoute = route; routeIndex = i; break; }
        }

        const routeToDisplay = safestRoute ? routeIndex : 0;
        directionsRenderer.setDirections(response);
        directionsRenderer.setRouteIndex(routeToDisplay);
        map.fitBounds(response.routes[0].bounds);

        if (safestRoute) {
          setStatusMessage(`Safest route to ${endPlace.name} displayed.`);
        } else {
          setStatusMessage("Could not find a route that avoids all danger zones. Showing shortest route.");
        }
        setCurrentRouteInfo({ origin: userLocation, destination: endPlace, name: `Route to ${endPlace.name}` });
      } else {
        setStatusMessage("Could not find a route.");
      }
      setIsLoading(false);
    });
  };
  
  const handleSaveRoute = () => {
    if (!currentRouteInfo) return;
    const newRoute = { ...currentRouteInfo, id: Date.now() };
    const updatedRoutes = [...savedRoutes, newRoute];
    setSavedRoutes(updatedRoutes);
    localStorage.setItem('savedUrbanAllyRoutes', JSON.stringify(updatedRoutes));
    setStatusMessage(`Route "${newRoute.name}" saved!`);
    setCurrentRouteInfo(null);
  };

  const handleLoadRoute = (route) => {
    if (!map || !directionsRenderer) return;
    setAppMode('safeRoute');
    setTimeout(() => {
      setStatusMessage(`Loading saved route to ${route.destination.name}...`);
      directionsRenderer.setMap(map);
      new google.maps.DirectionsService().route({
        origin: route.origin,
        // THIS IS THE CORRECTED LINE:
        destination: route.destination.geometry.location,
        travelMode: google.maps.TravelMode.WALKING
      }, (response, status) => {
        if(status === "OK") {
          directionsRenderer.setDirections(response);
          if (response.routes && response.routes.length > 0) {
            map.fitBounds(response.routes[0].bounds);
          }
        }
      });
    }, 100);
  };

  const handleDeleteRoute = (e, routeId) => {
    e.stopPropagation();
    const updatedRoutes = savedRoutes.filter(route => route.id !== routeId);
    setSavedRoutes(updatedRoutes);
    localStorage.setItem('savedUrbanAllyRoutes', JSON.stringify(updatedRoutes));
  };

  const resetToChoice = () => {
    if (directionsRenderer) directionsRenderer.setMap(null);
    map.setCenter({ lat: 17.4399, lng: 78.4983 });
    map.setZoom(12);
    setAppMode('choice');
  };

  return (
    <>
      <div ref={mapRef} className="map-container" />
      {appMode === 'choice' && (
        <div className="panel welcome-panel">
          <h1>Urban Ally</h1>
          <p>Your guide to navigating the city.</p>
          <button className="choice-btn distance-checker-btn" onClick={() => setAppMode('distanceChecker')}>
            <FiSearch size={20} /> Check Distance
          </button>
          <button className="choice-btn safe-route-btn" onClick={() => setAppMode('safeRoute')}>
            <FiMapPin size={20} /> Find Safe Route
          </button>
          <button className="choice-btn view-routes-btn" onClick={() => setAppMode('viewSaved')}>
            <FiStar size={20} /> My Saved Routes ({savedRoutes.length})
          </button>
        </div>
      )}
      {appMode === 'viewSaved' && (
        <div className="panel saved-routes-panel" style={{left: '20px', top: '20px', transform: 'none'}}>
          <button className="back-btn" onClick={resetToChoice}><FiArrowLeft /> Back</button>
          <h2>My Saved Routes</h2>
          {savedRoutes.length > 0 ? (
            <ul>
              {savedRoutes.map((route) => (
                <li key={route.id} onClick={() => handleLoadRoute(route)}>
                  {route.name}
                  <button className="delete-route-btn" onClick={(e) => handleDeleteRoute(e, route.id)}>
                    <FiTrash2 size={14} />
                  </button>
                </li>
              ))}
            </ul>
          ) : <p>No routes saved yet.</p>}
        </div>
      )}
      {(appMode === 'distanceChecker' || appMode === 'safeRoute') && (
        <div className="panel ui-panel">
          <button className="back-btn" onClick={resetToChoice}><FiArrowLeft /> Back</button>
          <h2>{appMode === 'distanceChecker' ? 'Distance Checker' : 'Safe Route Finder'}</h2>
          <div className="status-container">
            {isLoading && <div className="loader"></div>}
            <p>{statusMessage}</p>
          </div>
          {appMode === 'distanceChecker' && (
            <input ref={startInputRef} type="text" placeholder="Start Location..." className="search-box" />
          )}
          <input ref={endInputRef} type="text" placeholder={appMode === 'distanceChecker' ? "End Location..." : "Enter Destination..."} className="search-box" style={{marginTop: '10px'}}/>
          <button className="demo-route-btn" onClick={appMode === 'distanceChecker' ? handleDistanceCheck : handleFindSafestRoute} style={{marginTop: '10px'}}>
            {appMode === 'distanceChecker' ? 'Calculate Distance' : 'Find Safest Route'}
          </button>
          {appMode === 'safeRoute' && currentRouteInfo && (
            <button className="save-route-btn" onClick={handleSaveRoute}>
              <FiSave size={18} /> Save This Route
            </button>
          )}
        </div>
      )}
    </>
  );
}

export default MapPage;