import {
  Body,
  Container,
  Head,
  Heading,
  Html,
  Preview,
  Section,
  Text,
  Hr,
} from '@react-email/components';
import * as React from 'react';

interface BookingPaidEmailProps {
  instructorName?: string;
  studentName?: string;
  studentEmail?: string;
  bookingDate?: string;
  bookingTime?: string;
  priceEur?: number;
}

export const BookingPaidEmail = ({
  instructorName = 'Inštruktor',
  studentName = 'Študent',
  studentEmail = '',
  bookingDate = '1. januar 2026',
  bookingTime = '10:00',
  priceEur = 0,
}: BookingPaidEmailProps) => (
  <Html>
    <Head />
    <Preview>Novo plačano naročilo za lekcijo!</Preview>
    <Body style={{ backgroundColor: '#f6f9fc', fontFamily: 'sans-serif' }}>
      <Container style={{ backgroundColor: '#fff', maxWidth: 600, margin: '0 auto', padding: 32 }}>
        <Section style={{ textAlign: 'center', background: 'linear-gradient(135deg, #7C3AED 0%, #6D28D9 100%)', padding: 32 }}>
          <Heading style={{ color: '#fff', fontSize: 32, fontWeight: 700 }}>📚 Študko</Heading>
        </Section>
        
        <Section style={{ padding: 32 }}>
          <Heading as="h2" style={{ color: '#1a1a1a', fontSize: 24, fontWeight: 600, marginBottom: 20 }}>
            Novo plačano naročilo! 💰
          </Heading>
          
          <Text style={{ fontSize: 16 }}>
            Pozdravljeni, {instructorName}!
          </Text>
          
          <Text style={{ fontSize: 16, marginTop: 16 }}>
            Študent <strong>{studentName}</strong> je uspešno plačal lekcijo pri vas.
          </Text>

          <Hr style={{ margin: '24px 0', borderColor: '#e5e7eb' }} />

          <Section style={{ backgroundColor: '#f3f4f6', padding: 20, borderRadius: 8 }}>
            <Text style={{ fontSize: 14, fontWeight: 600, color: '#6b7280', marginBottom: 8 }}>
              PODATKI O LEKCIJI
            </Text>
            <Text style={{ fontSize: 16, margin: '8px 0' }}>
              📅 <strong>Datum:</strong> {bookingDate}
            </Text>
            <Text style={{ fontSize: 16, margin: '8px 0' }}>
              🕐 <strong>Ura:</strong> {bookingTime}
            </Text>
            <Text style={{ fontSize: 16, margin: '8px 0' }}>
              💵 <strong>Plačano:</strong> {priceEur}€
            </Text>
            {studentEmail && (
              <Text style={{ fontSize: 16, margin: '8px 0' }}>
                📧 <strong>Email študenta:</strong> {studentEmail}
              </Text>
            )}
          </Section>

          <Hr style={{ margin: '24px 0', borderColor: '#e5e7eb' }} />

          <Section style={{ backgroundColor: '#fef3c7', padding: 20, borderRadius: 8, marginTop: 24 }}>
            <Text style={{ fontSize: 14, fontWeight: 600, color: '#92400e', marginBottom: 8 }}>
              ⚠️ POMEMBNO: Naslednji koraki
            </Text>
            <Text style={{ fontSize: 15, color: '#78350f', lineHeight: 1.6 }}>
              Prosimo, da študentu <strong>{studentName}</strong> čim prej pošljete:<br /><br />
              1. 🔗 <strong>Zoom link</strong> ali povezavo do online sestanka<br />
              2. 📝 <strong>Navodila</strong> za pripravo na lekcijo (če je potrebno)<br />
              3. 🎯 <strong>Potrditev termina</strong> in morebitne dodatne informacije
            </Text>
          </Section>

          <Text style={{ fontSize: 14, color: '#6b7280', marginTop: 24, lineHeight: 1.6 }}>
            Študent pričakuje, da bo prejel Zoom link vsaj <strong>1 uro pred lekcijo</strong>. 
            Lahko mu pišete direktno na email ali prek platforme Študko.
          </Text>
        </Section>

        <Section style={{ textAlign: 'center', color: '#666', fontSize: 14, padding: 32, paddingTop: 0 }}>
          <Text style={{ marginBottom: 8 }}>
            Hvala, ker uporabljate Študko! 🎓
          </Text>
          <Text style={{ fontSize: 12, color: '#999' }}>
            Če imate vprašanja, nas kontaktirajte na info@studko.si
          </Text>
        </Section>
      </Container>
    </Body>
  </Html>
);

export default BookingPaidEmail;
