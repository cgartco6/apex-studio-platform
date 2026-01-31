// Add this after other imports
import GamificationOverlay from './components/gamification/GamificationOverlay';
import { AddictionProvider } from './context/AddictionContext';

// Wrap the entire app with AddictionProvider
function App() {
  return (
    <Provider store={store}>
      <PersistGate loading={<Loading />} persistor={persistor}>
        <AuthProvider>
          <CartProvider>
            <AIProvider>
              <AddictionProvider>  {/* Add this */}
                <Router>
                  <div className="App">
                    <GamificationOverlay />  {/* Add this */}
                    <Toaster />
                    {/* ... rest of the code ... */}
                  </div>
                </Router>
              </AddictionProvider>  {/* Add this */}
            </AIProvider>
          </CartProvider>
        </AuthProvider>
      </PersistGate>
    </Provider>
  );
}

// Add new routes
import CourseLanding from './pages/CourseLanding';
import ReferralDashboard from './pages/ReferralDashboard';
// Add to routes
<Route path="/course" element={<CourseLanding />} />
<Route path="/referral" element={<ReferralDashboard />} />
