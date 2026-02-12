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

interface TikTokRejectedEmailProps {
  userName?: string;
  reason?: string;
}

export const TikTokRejectedEmail = ({
  userName = 'Uporabnik',
  reason,
}: TikTokRejectedEmailProps) => (
  <Html>
    <Head />
    <Preview>Žal tvoj TikTok izziv ni bil odobren.</Preview>
    <Body style={{ backgroundColor: '#f6f9fc', fontFamily: 'sans-serif' }}>
      <Container style={{ backgroundColor: '#fff', maxWidth: 600, margin: '0 auto', padding: 32 }}>
        <Section style={{ textAlign: 'center', background: 'linear-gradient(135deg, #7C3AED 0%, #6D28D9 100%)', padding: 32 }}>
          <Heading style={{ color: '#fff', fontSize: 32, fontWeight: 700 }}>📚 Študko</Heading>
        </Section>
        <Section style={{ padding: 32 }}>
          <Heading as="h2" style={{ color: '#1a1a1a', fontSize: 24, fontWeight: 600, marginBottom: 20 }}>
            Žal nam je, {userName}.
          </Heading>
          <Text style={{ fontSize: 16 }}>
            Tvoj TikTok izziv <b>ni bil odobren</b>.
          </Text>
          {reason && (
            <Text style={{ fontSize: 16, marginTop: 16 }}>
              <b>Razlog:</b> {reason}
            </Text>
          )}
          <Text style={{ fontSize: 16, marginTop: 24 }}>
            Če imaš vprašanja, nam piši na <a href="mailto:info@studko.si">info@studko.si</a>.
          </Text>
        </Section>
        <Section style={{ textAlign: 'center', color: '#666', fontSize: 14, marginTop: 32 }}>
          <Text>Hvala za sodelovanje v TikTok izzivu! 💜</Text>
        </Section>
      </Container>
    </Body>
  </Html>
);

export default TikTokRejectedEmail;
