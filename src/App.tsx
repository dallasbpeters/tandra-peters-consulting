import { Nav } from "./components/Nav";
import { Hero } from "./components/Hero";
import ScrollVelocity from "./components/ScrollText";
import { About } from "./components/About";
import { Services } from "./components/Services";
import { Mission } from "./components/Mission";
import { Expertise } from "./components/Expertise";
import  {WallyReviews}  from "./components/Testimonials";
import { Contact } from "./components/Contact";
import { Footer } from "./components/Footer";
import Band  from "./components/Band";
import { theme } from "./theme";

function App() {
  return (
    <div style={{ 
      minHeight: "100vh", 
      backgroundColor: theme.colors.paper,
      color: theme.colors.everglade,
      fontFamily: theme.fonts.body
    }}>
      <Nav />
      <main>
        <Hero />
        <ScrollVelocity
        texts={[{ text: 'Amarillo * Canyon * Lubbock * San Antonio * Kerrville * Belton * Temple * Waco * Fort Worth * Austin * Surrounding Areas * San Antonio * Kerrville * Belton * Temple * Waco * Fort Worth * Austin * Surrounding Areas *' }]}
        />
        <About />
        <Services />
        <Mission />
        <Expertise />
        <WallyReviews />
        <Band tint={theme.colors.everglade} colors={[theme.colors.evergladeLight, theme.colors.evergladeMuted, theme.colors.paper, theme.colors.purple, theme.colors.purple, theme.colors.purple]} />
        <Contact />
        <Band reverse={true} rotate={true} tint={theme.colors.everglade} colors={[theme.colors.evergladeLight, theme.colors.evergladeMuted, theme.colors.paper, theme.colors.purple, theme.colors.purple, theme.colors.purple]} />
      </main>
      <Footer />
    </div>
  );
}

export default App;
