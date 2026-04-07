import React, { useState, useEffect } from 'react';
import { collection, onSnapshot, doc, setDoc, deleteDoc, addDoc } from 'firebase/firestore';
import { db, auth, loginWithGoogle, logout } from '../firebase';
import { onAuthStateChanged } from 'firebase/auth';
import { FeaturedBusiness } from './Directory';
import { Loader2, Plus, Trash2, Edit2, LogOut, LogIn, CheckCircle, AlertCircle } from 'lucide-react';

export default function AdminPanel() {
  const [user, setUser] = useState<any>(null);
  const [loadingAuth, setLoadingAuth] = useState(true);
  const [businesses, setBusinesses] = useState<FeaturedBusiness[]>([]);
  const [loadingData, setLoadingData] = useState(false);
  
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formData, setFormData] = useState<Partial<FeaturedBusiness>>({});
  const [toast, setToast] = useState<{message: string, type: 'success' | 'error'} | null>(null);

  const showToast = (message: string, type: 'success' | 'error') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 4000);
  };

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
      setLoadingAuth(false);
    });
    return () => unsubscribe();
  }, []);

  useEffect(() => {
    if (user) {
      setLoadingData(true);
      const unsubscribe = onSnapshot(collection(db, 'featured_businesses'), (snapshot) => {
        const b: FeaturedBusiness[] = [];
        snapshot.forEach((doc) => {
          b.push({ id: doc.id, ...doc.data() } as FeaturedBusiness);
        });
        b.sort((a, b) => a.order - b.order);
        setBusinesses(b);
        setLoadingData(false);
      }, (error) => {
        console.error("Error fetching data:", error);
        setLoadingData(false);
      });
      return () => unsubscribe();
    }
  }, [user]);

  const handleLogin = async () => {
    try {
      await loginWithGoogle();
    } catch (error) {
      alert("Error al iniciar sesión");
    }
  };

  const handleLogout = async () => {
    await logout();
  };

  const handleEdit = (business: FeaturedBusiness) => {
    setEditingId(business.id);
    setFormData(business);
  };

  const handleAddNew = () => {
    setEditingId('new');
    setFormData({
      name: '',
      category: '',
      rating: 5,
      reviews: 0,
      image: '',
      description: '',
      address: '',
      lat: -34.6037,
      lng: -58.4956,
      isPremium: false,
      order: businesses.length + 1
    });
  };

  const handleCancel = () => {
    setEditingId(null);
    setFormData({});
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (editingId === 'new') {
        await addDoc(collection(db, 'featured_businesses'), formData);
        showToast('Comercio añadido exitosamente. Ya está visible en la guía.', 'success');
      } else if (editingId) {
        await setDoc(doc(db, 'featured_businesses', editingId), formData, { merge: true });
        showToast('Comercio actualizado exitosamente.', 'success');
      }
      setEditingId(null);
      setFormData({});
    } catch (error) {
      console.error("Error saving document:", error);
      showToast('Error al guardar. Asegúrate de tener permisos de administrador.', 'error');
    }
  };

  const handleDelete = async (id: string) => {
    if (window.confirm("¿Estás seguro de eliminar este comercio?")) {
      try {
        await deleteDoc(doc(db, 'featured_businesses', id));
        showToast('Comercio eliminado exitosamente.', 'success');
      } catch (error) {
        console.error("Error deleting document:", error);
        showToast('Error al eliminar.', 'error');
      }
    }
  };

  if (loadingAuth) {
    return <div className="min-h-screen flex items-center justify-center"><Loader2 className="animate-spin text-brand" size={48} /></div>;
  }

  if (!user) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="bg-white p-8 rounded-3xl shadow-sm border border-gray-100 text-center max-w-md w-full">
          <h1 className="font-serif text-3xl font-bold mb-2">Panel de Control</h1>
          <p className="text-gray-500 mb-8">Inicia sesión para administrar los comercios destacados.</p>
          <button 
            onClick={handleLogin}
            className="w-full bg-ink text-white py-3 rounded-xl font-medium flex items-center justify-center gap-2 hover:bg-gray-800 transition-colors"
          >
            <LogIn size={20} /> Iniciar Sesión con Google
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-5xl mx-auto">
        <header className="flex justify-between items-center mb-8 bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
          <div>
            <h1 className="font-serif text-2xl font-bold">Panel de Administrador</h1>
            <p className="text-sm text-gray-500">{user.email}</p>
          </div>
          <div className="flex gap-4">
            <a href="/" className="text-brand font-medium hover:underline flex items-center">Ver sitio web</a>
            <button onClick={handleLogout} className="text-gray-500 hover:text-red-500 flex items-center gap-1">
              <LogOut size={18} /> Salir
            </button>
          </div>
        </header>

        {editingId ? (
          <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
            <h2 className="text-xl font-bold mb-6">{editingId === 'new' ? 'Nuevo Comercio' : 'Editar Comercio'}</h2>
            <form onSubmit={handleSave} className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Nombre</label>
                <input required type="text" className="w-full border border-gray-300 rounded-lg p-2" value={formData.name || ''} onChange={e => setFormData({...formData, name: e.target.value})} />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Categoría</label>
                <input required type="text" className="w-full border border-gray-300 rounded-lg p-2" value={formData.category || ''} onChange={e => setFormData({...formData, category: e.target.value})} />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Calificación (0-5)</label>
                <input required type="number" step="0.1" min="0" max="5" className="w-full border border-gray-300 rounded-lg p-2" value={formData.rating || 0} onChange={e => setFormData({...formData, rating: parseFloat(e.target.value)})} />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Cantidad de Reviews</label>
                <input required type="number" className="w-full border border-gray-300 rounded-lg p-2" value={formData.reviews || 0} onChange={e => setFormData({...formData, reviews: parseInt(e.target.value)})} />
              </div>
              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-1">URL de la Imagen (Pega aquí el enlace de la foto real)</label>
                <input required type="url" className="w-full border border-gray-300 rounded-lg p-2" value={formData.image || ''} onChange={e => setFormData({...formData, image: e.target.value})} />
                {formData.image && <img src={formData.image} alt="Preview" className="mt-2 h-32 object-cover rounded-lg" referrerPolicy="no-referrer" />}
              </div>
              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-1">Descripción</label>
                <textarea required className="w-full border border-gray-300 rounded-lg p-2 h-24" value={formData.description || ''} onChange={e => setFormData({...formData, description: e.target.value})} />
              </div>
              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-1">Dirección</label>
                <input required type="text" className="w-full border border-gray-300 rounded-lg p-2" value={formData.address || ''} onChange={e => setFormData({...formData, address: e.target.value})} />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Latitud (Mapa)</label>
                <input type="number" step="any" className="w-full border border-gray-300 rounded-lg p-2" value={formData.lat || ''} onChange={e => setFormData({...formData, lat: parseFloat(e.target.value)})} />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Longitud (Mapa)</label>
                <input type="number" step="any" className="w-full border border-gray-300 rounded-lg p-2" value={formData.lng || ''} onChange={e => setFormData({...formData, lng: parseFloat(e.target.value)})} />
              </div>
              
              <div className="md:col-span-2 border-t pt-4 mt-2">
                <h3 className="font-bold mb-4">Opciones Premium</h3>
                <div className="flex items-center mb-4">
                  <input type="checkbox" id="isPremium" className="mr-2" checked={formData.isPremium || false} onChange={e => setFormData({...formData, isPremium: e.target.checked})} />
                  <label htmlFor="isPremium" className="font-medium text-yellow-600">Es Sponsor Premium (Destacado Especial)</label>
                </div>
              </div>

              {formData.isPremium && (
                <>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Texto de Promoción (Ej: 10% OFF)</label>
                    <input type="text" className="w-full border border-gray-300 rounded-lg p-2" value={formData.promo || ''} onChange={e => setFormData({...formData, promo: e.target.value})} />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">WhatsApp (Ej: +5491125534340)</label>
                    <input type="text" className="w-full border border-gray-300 rounded-lg p-2" value={formData.whatsapp || ''} onChange={e => setFormData({...formData, whatsapp: e.target.value})} />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Instagram (Ej: @carniceriarac)</label>
                    <input type="text" className="w-full border border-gray-300 rounded-lg p-2" value={formData.instagram || ''} onChange={e => setFormData({...formData, instagram: e.target.value})} />
                  </div>
                </>
              )}

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Orden de visualización</label>
                <input required type="number" className="w-full border border-gray-300 rounded-lg p-2" value={formData.order || 0} onChange={e => setFormData({...formData, order: parseInt(e.target.value)})} />
              </div>

              <div className="md:col-span-2 flex justify-end gap-4 mt-6">
                <button type="button" onClick={handleCancel} className="px-6 py-2 border border-gray-300 rounded-lg font-medium hover:bg-gray-50">Cancelar</button>
                <button type="submit" className="px-6 py-2 bg-brand text-white rounded-lg font-medium hover:bg-brand-dark">Guardar</button>
              </div>
            </form>
          </div>
        ) : (
          <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-xl font-bold">Comercios Destacados</h2>
              <button onClick={handleAddNew} className="bg-ink text-white px-4 py-2 rounded-lg text-sm font-medium flex items-center gap-2 hover:bg-gray-800">
                <Plus size={16} /> Agregar Nuevo
              </button>
            </div>

            {loadingData ? (
              <div className="flex justify-center py-12"><Loader2 className="animate-spin text-brand" size={32} /></div>
            ) : businesses.length === 0 ? (
              <div className="text-center py-8">
                <p className="text-gray-500 mb-4">No hay comercios destacados aún.</p>
                <button 
                  onClick={async () => {
                    const initialData = [
                      {
                        name: 'Carnicería RAC',
                        category: 'Carnicería Premium',
                        rating: 4.9,
                        reviews: 428,
                        image: 'https://images.unsplash.com/photo-1607623814075-e51df1bd682f?auto=format&fit=crop&w=800&q=80',
                        description: 'Cortes seleccionados de exportación, cerdo, achuras y elaborados propios. La mejor calidad de Villa del Parque con atención de primera.',
                        address: 'Cuenca 3000, Villa del Parque',
                        lat: -34.6037,
                        lng: -58.4956,
                        isPremium: true,
                        promo: '10% OFF en efectivo los findes',
                        whatsapp: '+5491125534340',
                        instagram: '@carniceriarac',
                        order: 1
                      },
                      {
                        name: 'Café de la Plaza',
                        category: 'Cafetería de Especialidad',
                        rating: 4.8,
                        reviews: 342,
                        image: 'https://images.unsplash.com/photo-1554118811-1e0d58224f24?auto=format&fit=crop&w=800&q=80',
                        description: 'El mejor café de especialidad frente a la Plaza Arenales. Pastelería artesanal y ambiente relajado.',
                        address: 'Nueva York 4000, Villa Devoto',
                        lat: -34.5985,
                        lng: -58.5105,
                        isPremium: false,
                        order: 2
                      },
                      {
                        name: 'Pizzería El Cuartito',
                        category: 'Pizzería',
                        rating: 4.6,
                        reviews: 890,
                        image: 'https://images.unsplash.com/photo-1513104890138-7c749659a591?auto=format&fit=crop&w=800&q=80',
                        description: 'Clásica pizza al molde con abundante muzzarella. Un ícono del barrio desde 1980.',
                        address: 'Cuenca 3200, Villa del Parque',
                        lat: -34.6015,
                        lng: -58.4975,
                        isPremium: false,
                        order: 3
                      }
                    ];
                    for (const b of initialData) {
                      await addDoc(collection(db, 'featured_businesses'), b);
                    }
                  }}
                  className="bg-brand text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-brand-dark"
                >
                  Cargar Datos Iniciales (RAC, Café, Pizzería)
                </button>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="border-b border-gray-200 text-sm text-gray-500">
                      <th className="pb-3 font-medium">Orden</th>
                      <th className="pb-3 font-medium">Comercio</th>
                      <th className="pb-3 font-medium">Categoría</th>
                      <th className="pb-3 font-medium">Tipo</th>
                      <th className="pb-3 font-medium text-right">Acciones</th>
                    </tr>
                  </thead>
                  <tbody>
                    {businesses.map(b => (
                      <tr key={b.id} className="border-b border-gray-100 last:border-0 hover:bg-gray-50">
                        <td className="py-4 text-sm">{b.order}</td>
                        <td className="py-4">
                          <div className="flex items-center gap-3">
                            <img src={b.image} alt={b.name} className="w-10 h-10 rounded-lg object-cover" referrerPolicy="no-referrer" />
                            <span className="font-medium">{b.name}</span>
                          </div>
                        </td>
                        <td className="py-4 text-sm text-gray-600">{b.category}</td>
                        <td className="py-4 text-sm">
                          {b.isPremium ? <span className="bg-yellow-100 text-yellow-800 px-2 py-1 rounded text-xs font-bold">Premium</span> : <span className="bg-gray-100 text-gray-800 px-2 py-1 rounded text-xs font-bold">Estándar</span>}
                        </td>
                        <td className="py-4 text-right">
                          <button onClick={() => handleEdit(b)} className="text-blue-600 hover:text-blue-800 p-2"><Edit2 size={18} /></button>
                          <button onClick={() => handleDelete(b.id)} className="text-red-600 hover:text-red-800 p-2"><Trash2 size={18} /></button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Toast Notification */}
      {toast && (
        <div className={`fixed bottom-6 right-6 px-6 py-4 rounded-2xl shadow-xl flex items-center gap-3 text-white animate-in slide-in-from-bottom-5 fade-in duration-300 z-50 ${toast.type === 'success' ? 'bg-green-600' : 'bg-red-600'}`}>
          {toast.type === 'success' ? <CheckCircle size={24} /> : <AlertCircle size={24} />}
          <span className="font-medium">{toast.message}</span>
        </div>
      )}
    </div>
  );
}
