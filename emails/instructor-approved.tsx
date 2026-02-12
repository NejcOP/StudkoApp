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

interface InstructorApprovedEmailProps {
  userName?: string;
}

export const InstructorApprovedEmail = ({
  userName = 'Uporabnik',
}: InstructorApprovedEmailProps) => (
  <Html>
    <Head />
    <Preview>Čestitamo! Tvoja prijava za inštruktorja je bila odobrena.</Preview>
    <Body style={{ backgroundColor: '#f6f9fc', fontFamily: 'sans-serif' }}>
      <Container style={{ backgroundColor: '#fff', maxWidth: 600, margin: '0 auto', padding: 32 }}>
        <Section style={{ textAlign: 'center', background: 'linear-gradient(135deg, #7C3AED 0%, #6D28D9 100%)', padding: 32 }}>
          <Heading style={{ color: '#fff', fontSize: 32, fontWeight: 700 }}>📚 Študko</Heading>
        </Section>
        <Section style={{ padding: 32 }}>
          <Heading as="h2" style={{ color: '#1a1a1a', fontSize: 24, fontWeight: 600, marginBottom: 20 }}>
            Čestitamo, {userName}!
          </Heading>
          <Text style={{ fontSize: 16 }}>
            Tvoja prijava za inštruktorja je bila <b>odobrena</b>.
          </Text>
          <Text style={{ fontSize: 16, marginTop: 24 }}>
            Zdaj si viden na seznamu inštruktorjev na Študko platformi in študenti te lahko kontaktirajo za inštrukcije.
          </Text>
          <Button style={{ background: '#7C3AED', color: '#fff', borderRadius: 8, padding: '14px 32px', fontWeight: 600, marginTop: 24 }} href="https://studko.si/tutor/dashboard">
            Pojdi na nadzorno ploščo
          </Button>
        </Section>
        <Section style={{ textAlign: 'center', color: '#666', fontSize: 14, marginTop: 32 }}>
          <Text>Priporočilo: Nastavi svojo razpoložljivost v nastavitvah profila, da študenti vedo kdaj si na voljo.</Text>
        </Section>
      </Container>
    </Body>
  </Html>
);

export default InstructorApprovedEmail;
