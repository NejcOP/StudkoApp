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

interface ProActivationEmailProps {
  userName?: string;
}

export const ProActivationEmail = ({
  userName = 'Študent',
}: ProActivationEmailProps) => {
  return (
    <Html>
      <Head />
      <Preview>Tvoj Študko PRO je tu! Začni uporabljati premium funkcije.</Preview>
      <Body style={main}>
        <Container style={container}>
          {/* Header */}
          <Section style={header}>
            <Heading style={heading}>🔥 Študko PRO</Heading>
          </Section>

          {/* Content */}
          <Section style={content}>
            <Heading as="h2" style={title}>
              Tvoj Študko PRO je tu! 🎉
            </Heading>
            
            <Text style={text}>
              Bravo, {userName}! 🚀
            </Text>

            <Text style={text}>
              <strong>Uspešno si nadgradil/a na Študko PRO!</strong> Zdaj imaš dostop do najboljših 
              funkcij, ki ti bodo pomagale pri učenju in študiju.
            </Text>

            <Section style={featureBox}>
              <Heading as="h3" style={featureTitle}>
                🌟 Kaj te čaka:
              </Heading>
              <Text style={featureItem}>✨ <strong>Neomejen AI asistent</strong> - Postavljaj neomejeno vprašanj</Text>
              <Text style={featureItem}>📝 <strong>Neomejeni povzetki</strong> - Generiraj povzetke brez omejitev</Text>
              <Text style={featureItem}>🎯 <strong>Premium kvizi</strong> - Ustvari kvize in flashcarde</Text>
              <Text style={featureItem}>🚫 <strong>Brez oglasov</strong> - Čist, motenjski izgled</Text>
              <Text style={featureItem}>⚡ <strong>Prednost pri novih funkcijah</strong> - Prvi preizkusi novosti</Text>
              <Text style={featureItem}>💜 <strong>Podpiraš našo skupnost</strong> - Hvala!</Text>
            </Section>

            <Button style={button} href="https://studko.si/dashboard">
              Začni raziskovati
            </Button>

            <Section style={infoBox}>
              <Text style={infoText}>
                💳 <strong>Naročnina:</strong> Tvoja mesečna naročnina se bo avtomatsko podaljšala. 
                Kadarkoli jo lahko prekliceš v nastavitvah profila.
              </Text>
            </Section>
          </Section>

          {/* Footer */}
          <Section style={footer}>
            <Text style={footerText}>
              Ekipa Študko 🚀 | Več kot le zapiski.
            </Text>
            <Text style={footerSmall}>
              Potrebuješ pomoč? Piši nam na info@studko.si
            </Text>
          </Section>
        </Container>
      </Body>
    </Html>
  );
};

export default ProActivationEmail;

// Styles
const main = {
  backgroundColor: '#f6f9fc',
  fontFamily: '-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,"Helvetica Neue",Ubuntu,sans-serif',
};

const container = {
  backgroundColor: '#ffffff',
  margin: '0 auto',
  padding: '0',
  marginBottom: '64px',
  maxWidth: '600px',
};

const header = {
  background: 'linear-gradient(135deg, #7C3AED 0%, #6D28D9 100%)',
  padding: '40px 0',
  textAlign: 'center' as const,
};

const heading = {
  color: '#ffffff',
  fontSize: '32px',
  fontWeight: '700',
  margin: '0',
};

const content = {
  padding: '40px 30px',
};

const title = {
  color: '#1a1a1a',
  fontSize: '24px',
  fontWeight: '600',
  marginBottom: '20px',
};

const text = {
  color: '#333333',
  fontSize: '16px',
  lineHeight: '1.6',
  margin: '16px 0',
};

const button = {
  backgroundColor: '#7C3AED',
  borderRadius: '8px',
  color: '#ffffff',
  fontSize: '16px',
  fontWeight: '600',
  textDecoration: 'none',
  textAlign: 'center' as const,
  display: 'block',
  padding: '14px 32px',
  margin: '24px 0',
};

const featureBox = {
  backgroundColor: '#f8f5ff',
  borderLeft: '4px solid #7C3AED',
  padding: '20px',
  marginTop: '24px',
  borderRadius: '4px',
};

const featureTitle = {
  color: '#7C3AED',
  fontSize: '18px',
  fontWeight: '600',
  marginTop: '0',
  marginBottom: '16px',
};

const featureItem = {
  color: '#333333',
  fontSize: '15px',
  lineHeight: '1.8',
  margin: '8px 0',
};

const infoBox = {
  backgroundColor: '#e3f2fd',
  borderLeft: '4px solid #2196f3',
  padding: '16px',
  marginTop: '24px',
  borderRadius: '4px',
};

const infoText = {
  color: '#0d47a1',
  fontSize: '14px',
  margin: '0',
};

const footer = {
  backgroundColor: '#f9f9f9',
  padding: '30px',
  textAlign: 'center' as const,
};

const footerText = {
  color: '#7C3AED',
  fontSize: '14px',
  fontWeight: '600',
  margin: '0 0 10px',
};

const footerSmall = {
  color: '#999999',
  fontSize: '12px',
  margin: '0',
};
