import {
  Body,
  Button,
  Container,
  Head,
  Heading,
  Html,
  Preview,
  Section,
  Text,
} from '@react-email/components';
import * as React from 'react';

interface TikTokApprovedEmailProps {
  userName?: string;
  proUntil: string;
}

export const TikTokApprovedEmail = ({
  userName = 'Uporabnik',
  proUntil,
}: TikTokApprovedEmailProps) => (
  <Html>
    <Head />
    <Preview>Čestitamo! Tvoj TikTok izziv je bil odobren in prejel si 1 mesec PRO dostopa.</Preview>
    <Body style={{ backgroundColor: '#f6f9fc', fontFamily: 'sans-serif' }}>
      <Container style={{ backgroundColor: '#fff', maxWidth: 600, margin: '0 auto', padding: 32 }}>
        <Section style={{ textAlign: 'center', background: 'linear-gradient(135deg, #7C3AED 0%, #6D28D9 100%)', padding: 32 }}>
          <Heading style={{ color: '#fff', fontSize: 32, fontWeight: 700 }}>📚 Študko</Heading>
        </Section>
        <Section style={{ padding: 32 }}>
          <Heading as="h2" style={{ color: '#1a1a1a', fontSize: 24, fontWeight: 600, marginBottom: 20 }}>
            Čestitamo, {userName}! 🎊
          </Heading>
          <Text style={{ fontSize: 16 }}>
            Tvoj TikTok izziv je bil <b>odobren</b>! Prejel si <b>1 mesec brezplačnega PRO dostopa</b>.
          </Text>
          <Text style={{ fontSize: 16 }}>
            <b>Velja do:</b> {proUntil}
          </Text>
          <Text style={{ fontSize: 16, marginTop: 24 }}>
            <b>Tvoje PRO prednosti:</b>
          </Text>
          <ul style={{ fontSize: 16, margin: '10px 0 24px 20px' }}>
            <li>✨ AI asistent za učenje</li>
            <li>📚 Neomejen dostop do vseh zapiskov</li>
            <li>🎯 Personalizirane kvize in flashcards</li>
            <li>📊 Napredna analitika učenja</li>
          </ul>
          <Button style={{ background: '#7C3AED', color: '#fff', borderRadius: 8, padding: '14px 32px', fontWeight: 600 }} href="https://studko.si/ai">
            Začni uporabljati PRO
          </Button>
        </Section>
        <Section style={{ textAlign: 'center', color: '#666', fontSize: 14, marginTop: 32 }}>
          <Text>Hvala za sodelovanje v TikTok izzivu! 💜</Text>
        </Section>
      </Container>
    </Body>
  </Html>
);

export default TikTokApprovedEmail;
