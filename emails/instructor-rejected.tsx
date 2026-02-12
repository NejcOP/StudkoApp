import {
  Body,
  Container,
  Head,
  Heading,
  Html,
  Preview,
  Section,
  Text,
} from '@react-email/components';
import * as React from 'react';

interface InstructorRejectedEmailProps {
  userName?: string;
  reason?: string;
}

export const InstructorRejectedEmail = ({
  userName = 'Uporabnik',
  reason,
}: InstructorRejectedEmailProps) => (
  <Html>
    <Head />
    <Preview>Žal tvoja prijava za inštruktorja ni bila odobrena.</Preview>
    <Body style={{ backgroundColor: '#f6f9fc', fontFamily: 'sans-serif' }}>
      <Container style={{ backgroundColor: '#fff', maxWidth: 600, margin: '0 auto', padding: 32 }}>
        <Section style={{ textAlign: 'center', background: 'linear-gradient(135deg, #7C3AED 0%, #6D28D9 100%)', padding: 32 }}>
          <Heading style={{ color: '#fff', fontSize: 32, fontWeight: 700 }}>📚 Študko</Heading>
        </Section>
        <Section style={{ padding: 32 }}>
          <Heading as="h2" style={{ color: '#1a1a1a', fontSize: 24, fontWeight: 600, marginBottom: 20 }}>
            Pozdravljeni, {userName}
          </Heading>
          <Text style={{ fontSize: 16 }}>
            Žal ti moramo sporočiti, da tvoja prijava za inštruktorja <b>ni bila odobrena</b>.
          </Text>
          {reason && (
            <Text style={{ fontSize: 16, marginTop: 16 }}>
              <b>Razlog:</b> {reason}
            </Text>
          )}
          <Text style={{ fontSize: 16, marginTop: 24 }}>
            Zahvaljujemo se ti za zanimanje in tvoj čas. Če imaš kakršna koli vprašanja, nas lahko kontaktiraš na info@studko.si.
          </Text>
          <Text style={{ fontSize: 16, marginTop: 16 }}>
            Želimo ti veliko uspeha pri prihodnjih projektih!
          </Text>
        </Section>
      </Container>
    </Body>
  </Html>
);

export default InstructorRejectedEmail;
