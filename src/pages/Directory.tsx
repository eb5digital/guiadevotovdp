import React, { useState, useEffect } from 'react';
import { Search, MapPin, Star, Coffee, ShoppingBag, Scissors, Dumbbell, Utensils, ArrowRight, ExternalLink, Loader2, Tag, MessageCircle, Instagram, X } from 'lucide-react';
import Markdown from 'react-markdown';
import { searchBusinesses, GeminiResponse } from '../services/geminiService';
import { collection, onSnapshot, query, orderBy } from 'firebase/firestore';
import { db } from '../firebase';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';
import { MapContainer, TileLayer, Marker, Popup } from 'react-leaflet';

// Fix for default marker icons in React Leaflet
delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
});

const CATEGORIES = [
  { id: 'gastronomia', name: 'Gastronomía', icon: Utensils },
  { id: 'cafeterias', name: 'Cafeterías', icon: Coffee },
  { id: 'indumentaria', name: 'Indumentaria', icon: ShoppingBag },
  { id: 'peluquerias', name: 'Peluquerías', icon: Scissors },
  { id: 'gimnasios', name: 'Gimnasios', icon: Dumbbell },
];

export interface FeaturedBusiness {
  id: string;
  name: string;
  category: string;
  rating: number;
  reviews: number;
  image: string;
  description: string;
  address: string;
  lat?: number;
  lng?: number;
  isPremium: boolean;
  promo?: string;
  whatsapp?: string;
  instagram?: string;
  order: number;
}

export default function Directory() {
  const [searchQuery, setSearchQuery] = useState('');
  const [activeCategory, setActiveCategory] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState<GeminiResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [featuredBusinesses, setFeaturedBusinesses] = useState<FeaturedBusiness[]>([]);
  const [loadingFeatured, setLoadingFeatured] = useState(true);
  const [selectedBusiness, setSelectedBusiness] = useState<FeaturedBusiness | null>(null);

  useEffect(() => {
    const q = query(collection(db, 'featured_businesses'), orderBy('order', 'asc'));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const businesses: FeaturedBusiness[] = [];
      snapshot.forEach((doc) => {
        businesses.push({ id: doc.id, ...doc.data() } as FeaturedBusiness);
      });
      setFeaturedBusinesses(businesses);
      setLoadingFeatured(false);
    }, (err) => {
      console.error("Error fetching featured businesses:", err);
      setLoadingFeatured(false);
    });

    return () => unsubscribe();
  }, []);

  const handleSearch = async (query: string, categoryName?: string) => {
    if (!query && !categoryName) return;
    
    setLoading(true);
    setError(null);
    setResults(null);
    
    const searchTerm = categoryName || query;
    
    try {
      const response = await searchBusinesses(searchTerm, 'Villa Devoto y Villa del Parque');
      setResults(response);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Ocurrió un error inesperado.');
    } finally {
      setLoading(false);
    }
  };

  const onSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setActiveCategory(null);
    handleSearch(searchQuery);
  };

  const onCategoryClick = (categoryName: string) => {
    if (activeCategory === categoryName) {
      setActiveCategory(null);
      setResults(null);
      return;
    }
    setSearchQuery('');
    setActiveCategory(categoryName);
    handleSearch('', categoryName);
  };

  // Filter featured businesses based on active category or search query
  const filteredBusinesses = featuredBusinesses.filter(business => {
    if (activeCategory) {
      return business.category.toLowerCase().includes(activeCategory.toLowerCase()) || 
             activeCategory.toLowerCase().includes(business.category.toLowerCase());
    }
    if (searchQuery && !results) {
      return business.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
             business.category.toLowerCase().includes(searchQuery.toLowerCase());
    }
    return true;
  });

  // Calculate how many placeholders we need to show (min 3 total spots, or up to 6)
  const displaySlots = Math.max(3, Math.ceil(filteredBusinesses.length / 3) * 3);
  const placeholders = Array.from({ length: Math.max(0, displaySlots - filteredBusinesses.length) }).map((_, i) => ({
    id: `placeholder-${i}`,
    isPlaceholder: true
  }));

  const displayItems = [...filteredBusinesses, ...placeholders];

  return (
    <div className="min-h-screen flex flex-col">
      {/* Header / Hero */}
      <header className="bg-ink text-white pt-16 pb-24 px-6 relative overflow-hidden">
        <div className="absolute inset-0 opacity-20">
          <img 
            src="https://picsum.photos/seed/buenosaires/1920/1080" 
            alt="Buenos Aires" 
            className="w-full h-full object-cover"
            referrerPolicy="no-referrer"
          />
          <div className="absolute inset-0 bg-gradient-to-b from-ink/80 to-ink"></div>
        </div>
        
        <div className="max-w-5xl mx-auto relative z-10">
          <div className="flex flex-wrap items-center gap-4 mb-6">
            <div className="flex items-center gap-2 text-brand">
              <MapPin size={20} />
              <span className="font-medium tracking-wider uppercase text-sm">Comuna 11, CABA</span>
            </div>
            <div className="flex items-center gap-2 bg-white/10 backdrop-blur-md px-3 py-1.5 rounded-full border border-white/20 text-white text-sm font-medium">
              <span className="w-2 h-2 rounded-full bg-green-400 animate-pulse"></span>
              Más de 1.000 comercios en la zona
            </div>
          </div>
          
          <h1 className="font-serif text-5xl md:text-7xl font-bold mb-6 leading-tight">
            Descubrí lo mejor <br className="hidden md:block" />
            <span className="text-brand">de tu barrio.</span>
          </h1>
          
          <p className="text-lg md:text-xl text-gray-300 max-w-2xl mb-10">
            La guía definitiva de comercios, gastronomía y servicios en Villa Devoto y Villa del Parque. Apoyá el comercio local.
          </p>
          
          <form onSubmit={onSearchSubmit} className="relative max-w-3xl flex flex-col md:flex-row gap-3">
            <div className="relative flex-grow">
              <input 
                type="text" 
                placeholder="¿Qué estás buscando? (ej. sushi, peluquería)" 
                className="w-full bg-white text-ink rounded-full py-4 pl-6 pr-16 text-lg focus:outline-none focus:ring-2 focus:ring-brand shadow-lg"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
              <button 
                type="submit"
                className="absolute right-2 top-2 bottom-2 bg-brand text-white rounded-full p-3 hover:bg-brand-dark transition-colors flex items-center justify-center"
                disabled={loading}
              >
                <Search size={24} />
              </button>
            </div>
            <select
              className="bg-white text-ink rounded-full px-6 py-4 text-lg focus:outline-none focus:ring-2 focus:ring-brand shadow-lg md:w-64 appearance-none cursor-pointer border-r-8 border-transparent"
              value={activeCategory || ''}
              onChange={(e) => {
                const val = e.target.value;
                if (val) {
                  onCategoryClick(val);
                } else {
                  setActiveCategory(null);
                  setResults(null);
                }
              }}
            >
              <option value="">Todas las categorías</option>
              {CATEGORIES.map(c => (
                <option key={c.id} value={c.name}>{c.name}</option>
              ))}
            </select>
          </form>
        </div>
      </header>

      <main className="flex-grow max-w-5xl mx-auto w-full px-6 py-12 -mt-10 relative z-20">
        
        {/* Categories */}
        <section className="mb-16">
          <div className="flex overflow-x-auto pb-4 gap-4 hide-scrollbar">
            {CATEGORIES.map((cat) => {
              const Icon = cat.icon;
              const isActive = activeCategory === cat.name;
              return (
                <button
                  key={cat.id}
                  onClick={() => onCategoryClick(cat.name)}
                  className={`flex items-center gap-3 px-6 py-4 rounded-2xl whitespace-nowrap transition-all shadow-sm border ${
                    isActive 
                      ? 'bg-ink text-white border-ink' 
                      : 'bg-white text-ink border-gray-200 hover:border-brand hover:shadow-md'
                  }`}
                >
                  <Icon size={20} className={isActive ? 'text-brand' : 'text-gray-500'} />
                  <span className="font-medium">{cat.name}</span>
                </button>
              );
            })}
          </div>
        </section>

        {/* Dynamic Results Section */}
        {(loading || results || error) && (
          <section className="mb-20 bg-white rounded-3xl p-8 md:p-12 shadow-sm border border-gray-100" id="results">
            {loading && (
              <div className="flex flex-col items-center justify-center py-20 text-gray-500">
                <Loader2 size={48} className="animate-spin mb-4 text-brand" />
                <p className="text-lg">Buscando las mejores opciones en la zona...</p>
              </div>
            )}
            
            {error && (
              <div className="bg-red-50 text-red-600 p-6 rounded-2xl border border-red-100">
                <p className="font-medium">{error}</p>
              </div>
            )}
            
            {results && !loading && (
              <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
                <div className="flex items-center justify-between mb-8 border-b border-gray-100 pb-6">
                  <h2 className="font-serif text-3xl font-bold">
                    Resultados para <span className="text-brand">{activeCategory || searchQuery}</span>
                  </h2>
                  <span className="text-sm font-medium bg-gray-100 px-3 py-1 rounded-full text-gray-600">
                    Recomendaciones de IA
                  </span>
                </div>
                
                <div className="markdown-body mb-10">
                  <Markdown>{results.markdown}</Markdown>
                </div>
                
                {results.mapsLinks.length > 0 && (
                  <div className="mt-10 pt-8 border-t border-gray-100">
                    <h3 className="font-medium text-lg mb-4 flex items-center gap-2">
                      <MapPin size={20} className="text-brand" />
                      Ver en Google Maps
                    </h3>
                    <div className="flex flex-wrap gap-3">
                      {results.mapsLinks.map((link, idx) => (
                        <a 
                          key={idx}
                          href={link.uri}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-2 bg-gray-50 hover:bg-gray-100 border border-gray-200 px-4 py-2 rounded-full text-sm font-medium transition-colors"
                        >
                          {link.title}
                          <ExternalLink size={14} className="text-gray-400" />
                        </a>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}
          </section>
        )}

        {/* Featured Businesses (Monetization) */}
        {!loading && (
          <section className="mb-20">
            <div className="flex items-end justify-between mb-8">
              <div>
                <h2 className="font-serif text-3xl font-bold mb-2">Comercios Destacados</h2>
                <p className="text-gray-500">Los favoritos de la comunidad esta semana.</p>
              </div>
              <button className="hidden md:flex items-center gap-2 text-brand font-medium hover:text-brand-dark transition-colors">
                Ver todos <ArrowRight size={18} />
              </button>
            </div>

            {/* Interactive Map */}
            {!loadingFeatured && filteredBusinesses.some(b => b.lat && b.lng) && (
              <div className="mb-12 rounded-3xl overflow-hidden shadow-sm border border-gray-100 h-[400px] relative z-0">
                <MapContainer 
                  center={[-34.6015, -58.5000]} 
                  zoom={14} 
                  style={{ height: '100%', width: '100%' }}
                  scrollWheelZoom={false}
                >
                  <TileLayer
                    attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
                    url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                  />
                  {filteredBusinesses.map(business => {
                    if (business.lat && business.lng) {
                      return (
                        <Marker 
                          key={business.id} 
                          position={[business.lat, business.lng]}
                        >
                          <Popup>
                            <div className="text-center">
                              <img src={business.image} alt={business.name} className="w-full h-24 object-cover rounded-lg mb-2" referrerPolicy="no-referrer" />
                              <h3 className="font-bold text-sm mb-1">{business.name}</h3>
                              <p className="text-xs text-gray-500 mb-2">{business.category}</p>
                              <button 
                                onClick={() => setSelectedBusiness(business)}
                                className="bg-brand text-white text-xs px-3 py-1.5 rounded-full w-full font-medium"
                              >
                                Ver detalles
                              </button>
                            </div>
                          </Popup>
                        </Marker>
                      );
                    }
                    return null;
                  })}
                </MapContainer>
              </div>
            )}
            
            {loadingFeatured ? (
              <div className="flex justify-center py-12">
                <Loader2 size={32} className="animate-spin text-brand" />
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                {displayItems.map((item: any) => {
                  if (item.isPlaceholder) {
                    return (
                      <div key={item.id} className="bg-gray-50 rounded-3xl border-2 border-dashed border-gray-200 flex flex-col items-center justify-center p-8 text-center hover:border-brand hover:bg-orange-50 transition-colors cursor-pointer group min-h-[400px]">
                        <div className="w-16 h-16 bg-gray-200 rounded-full flex items-center justify-center mb-4 group-hover:bg-brand/20 transition-colors">
                          <Star size={24} className="text-gray-400 group-hover:text-brand" />
                        </div>
                        <h3 className="font-serif text-xl font-bold text-gray-400 group-hover:text-brand mb-2">Espacio Disponible</h3>
                        <p className="text-gray-500 text-sm mb-6">Destacá tu comercio aquí y llegá a más clientes en la comuna.</p>
                        <a href="https://wa.me/5491125534340?text=Hola,%20quiero%20anunciar%20mi%20negocio%20en%20la%20Guía%20Comuna%2011" target="_blank" rel="noopener noreferrer" className="bg-white text-ink border border-gray-200 px-6 py-2 rounded-full text-sm font-medium group-hover:border-brand group-hover:text-brand transition-colors inline-block">
                          Anunciar mi negocio
                        </a>
                      </div>
                    );
                  }

                  const business = item as FeaturedBusiness;
                  return (
                  <div 
                    key={business.id} 
                    onClick={() => !business.isPremium && setSelectedBusiness(business)}
                    className={`bg-white rounded-3xl overflow-hidden shadow-sm border transition-all duration-300 group flex flex-col ${business.isPremium ? 'border-yellow-400 shadow-yellow-100 hover:shadow-yellow-200 ring-1 ring-yellow-400' : 'border-gray-100 hover:shadow-xl cursor-pointer'}`}
                  >
                    <div className="relative h-56 overflow-hidden">
                      <img 
                        src={business.image} 
                        alt={business.name} 
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                        referrerPolicy="no-referrer"
                      />
                      {business.isPremium ? (
                        <div className="absolute top-4 left-4 bg-yellow-400 text-yellow-950 px-3 py-1 rounded-full text-xs font-bold tracking-wider uppercase shadow-md flex items-center gap-1">
                          <Star size={12} className="fill-yellow-950" /> Sponsor Premium
                        </div>
                      ) : (
                        <div className="absolute top-4 left-4 bg-white/90 backdrop-blur-sm px-3 py-1 rounded-full text-xs font-bold tracking-wider uppercase text-ink">
                          Destacado
                        </div>
                      )}
                    </div>
                    
                    <div className="p-6 flex flex-col flex-grow">
                      <div className="flex justify-between items-start mb-2">
                        <h3 className="font-serif text-xl font-bold leading-tight group-hover:text-brand transition-colors">
                          {business.name}
                        </h3>
                        <div className="flex items-center gap-1 bg-gray-50 px-2 py-1 rounded-lg">
                          <Star size={14} className="text-yellow-500 fill-yellow-500" />
                          <span className="text-sm font-bold">{business.rating}</span>
                        </div>
                      </div>
                      
                      <p className="text-sm text-brand font-medium mb-3">{business.category}</p>
                      
                      {business.promo && (
                        <div className="flex items-center gap-2 bg-green-50 text-green-700 px-3 py-2 rounded-xl text-sm font-medium mb-4 border border-green-100">
                          <Tag size={16} />
                          {business.promo}
                        </div>
                      )}
                      
                      <p className="text-gray-600 text-sm mb-6 flex-grow">{business.description}</p>
                      
                      {business.isPremium && (
                        <div className="flex gap-2 mt-auto mb-4">
                          {business.whatsapp && (
                            <a href={`https://wa.me/${business.whatsapp.replace(/[^0-9]/g, '')}`} target="_blank" rel="noopener noreferrer" className="flex-1 bg-[#25D366] hover:bg-[#20bd5a] text-white py-2.5 rounded-xl text-sm font-medium flex items-center justify-center gap-2 transition-colors">
                              <MessageCircle size={16} /> WhatsApp
                            </a>
                          )}
                          {business.instagram && (
                            <a href={`https://instagram.com/${business.instagram.replace('@', '')}`} target="_blank" rel="noopener noreferrer" className="flex-1 bg-gradient-to-r from-[#833ab4] via-[#fd1d1d] to-[#fcb045] hover:opacity-90 text-white py-2.5 rounded-xl text-sm font-medium flex items-center justify-center gap-2 transition-opacity">
                              <Instagram size={16} /> Instagram
                            </a>
                          )}
                        </div>
                      )}
                      
                      <div className={`flex items-center justify-between pt-4 border-t border-gray-100 ${!business.isPremium ? 'mt-auto' : ''}`}>
                        <div className="flex items-center gap-2 text-xs text-gray-500">
                          <MapPin size={14} />
                          <span className="truncate max-w-[150px]">{business.address}</span>
                        </div>
                        <span className="text-xs font-medium text-gray-400">
                          {business.reviews} reviews
                        </span>
                      </div>
                    </div>
                  </div>
                );
                })}
              </div>
            )}
          </section>
        )}
        
        {/* Monetization CTA */}
        {!loading && (
          <section className="bg-ink text-white rounded-3xl p-8 md:p-12 relative overflow-hidden">
            <div className="absolute top-0 right-0 w-64 h-64 bg-brand rounded-full blur-3xl opacity-20 -mr-20 -mt-20"></div>
            <div className="relative z-10 md:w-2/3">
              <h2 className="font-serif text-3xl font-bold mb-4">¿Tenés un comercio en la zona?</h2>
              <p className="text-gray-300 mb-8 text-lg">
                Llegá a miles de vecinos de Villa Devoto y Villa del Parque. Destacá tu negocio en nuestra guía y aumentá tus ventas.
              </p>
              <a href="https://wa.me/5491125534340?text=Hola,%20quiero%20destacar%20mi%20negocio%20en%20la%20Guía%20Comuna%2011" target="_blank" rel="noopener noreferrer" className="bg-brand hover:bg-brand-dark text-white px-8 py-4 rounded-full font-medium transition-colors inline-flex items-center gap-2">
                Quiero destacar mi negocio <ArrowRight size={18} />
              </a>
            </div>
          </section>
        )}
      </main>
      
      <footer className="bg-white border-t border-gray-200 py-12 mt-auto">
        <div className="max-w-5xl mx-auto px-6 flex flex-col md:flex-row justify-between items-center gap-6">
          <div className="flex items-center gap-2 text-ink">
            <MapPin size={24} className="text-brand" />
            <span className="font-serif text-xl font-bold">Guía Comuna 11</span>
          </div>
          <div className="flex flex-col items-center md:items-end gap-2">
            <p className="text-gray-500 text-sm">
              © {new Date().getFullYear()} Guía Comuna 11. Creado por <a href="https://www.emibugliolo.com/" target="_blank" rel="noopener noreferrer" className="text-brand hover:underline font-medium">https://www.emibugliolo.com/</a>
            </p>
            <a href="/admin" className="text-xs text-gray-400 hover:text-brand transition-colors">
              Acceso Administrador
            </a>
          </div>
        </div>
      </footer>

      {/* Business Details Modal */}
      {selectedBusiness && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6">
          <div 
            className="absolute inset-0 bg-ink/60 backdrop-blur-sm transition-opacity"
            onClick={() => setSelectedBusiness(null)}
          ></div>
          <div className="relative bg-white rounded-3xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto animate-in fade-in zoom-in-95 duration-200">
            <button 
              onClick={() => setSelectedBusiness(null)}
              className="absolute top-4 right-4 z-10 bg-white/80 backdrop-blur-sm text-ink p-2 rounded-full hover:bg-gray-100 transition-colors"
            >
              <X size={20} />
            </button>
            
            <div className="h-64 sm:h-80 relative w-full">
              <img 
                src={selectedBusiness.image} 
                alt={selectedBusiness.name} 
                className="w-full h-full object-cover"
                referrerPolicy="no-referrer"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent"></div>
              <div className="absolute bottom-6 left-6 right-6 text-white">
                <div className="flex items-center gap-2 mb-2">
                  <span className="bg-brand text-white px-3 py-1 rounded-full text-xs font-bold tracking-wider uppercase">
                    {selectedBusiness.category}
                  </span>
                  <div className="flex items-center gap-1 bg-black/40 backdrop-blur-md px-2 py-1 rounded-lg">
                    <Star size={14} className="text-yellow-400 fill-yellow-400" />
                    <span className="text-sm font-bold">{selectedBusiness.rating}</span>
                  </div>
                </div>
                <h2 className="font-serif text-3xl sm:text-4xl font-bold leading-tight">
                  {selectedBusiness.name}
                </h2>
              </div>
            </div>
            
            <div className="p-6 sm:p-8">
              <div className="flex items-start gap-3 mb-6 text-gray-600">
                <MapPin size={20} className="text-brand shrink-0 mt-0.5" />
                <p className="text-lg">{selectedBusiness.address}</p>
              </div>
              
              <div className="prose prose-gray max-w-none mb-8">
                <h3 className="text-xl font-bold text-ink mb-3">Sobre el comercio</h3>
                <p className="text-gray-600 leading-relaxed whitespace-pre-line">
                  {selectedBusiness.description}
                </p>
              </div>
              
              <div className="flex items-center justify-between pt-6 border-t border-gray-100">
                <div className="text-sm text-gray-500">
                  Basado en <span className="font-bold text-ink">{selectedBusiness.reviews}</span> reseñas de usuarios
                </div>
                <a 
                  href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(selectedBusiness.name + ' ' + selectedBusiness.address)}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-2 text-brand font-medium hover:text-brand-dark transition-colors"
                >
                  Ver en mapa <ExternalLink size={16} />
                </a>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
