"use client";

import { Anchor, Container, Stack, Text, Title } from "@mantine/core";
import Link from "next/link";

export default function AydinlatmaMetniPage() {
  return (
    <Container size="md" py="xl">
      <Stack gap="lg">
        <Title order={1}>Aydınlatma Metni (KVKK)</Title>
        <Text size="sm" c="dimmed">
          Son güncelleme: Mart 2026
        </Text>

        <Title order={3}>1. Veri Sorumlusu</Title>
        <Text size="sm">
          İşbu aydınlatma metni kapsamında kişisel verileriniz, 6698 sayılı Kişisel Verilerin Korunması Kanunu (“KVKK”) uyarınca veri sorumlusu sıfatıyla bu uygulamayı işleten tüzel kişi tarafından aşağıda açıklanan kapsamda işlenecektir.
        </Text>

        <Title order={3}>2. İşlenen Kişisel Veriler ve Amaçları</Title>
        <Text size="sm">
          Uygulama kapsamında; kimlik (ad, soyadı), iletişim (e-posta), rol ve departman bilgisi, çalışma saatleri ve vardiya kayıtları, izin ve takas talepleri ile güvenlik/denetim logları işlenmektedir. Bu veriler vardiya planlama, raporlama, yetkilendirme ve mevzuata uyum amacıyla işlenir.
        </Text>

        <Title order={3}>3. Hukuki Sebep ve Saklama Süresi</Title>
        <Text size="sm">
          Kişisel verileriniz KVKK’nın 5. ve 6. maddelerinde belirtilen hukuki sebeplere dayanılarak işlenir. Saklama süreleri, ilgili mevzuat ve işleme amacına uygun olarak belirlenir; denetim logları yasal zorunluluk süresi kadar saklanabilir.
        </Text>

        <Title order={3}>4. İlgili Kişi Hakları</Title>
        <Text size="sm">
          KVKK’nın 11. maddesi kapsamında kişisel verilerinizin işlenip işlenmediğini öğrenme, işlenmişse buna ilişkin bilgi talep etme, işlenme amacını ve amacına uygun kullanılıp kullanılmadığını öğrenme, yurt içinde veya yurt dışında aktarıldığı üçüncü kişileri bilme, eksik veya yanlış işlenmişse düzeltilmesini isteme, silinmesini veya yok edilmesini isteme, otomatik sistemler vasıtasıyla analiz edilmesi suretiyle aleyhinize bir sonucun ortaya çıkmasına itiraz etme ve kanuna aykırı işlenmesi sebebiyle zarara uğramanız hâlinde tazminat talep etme haklarına sahipsiniz. Başvurularınızı veri sorumlusuna yazılı veya kayıtlı elektronik ortamda iletebilirsiniz.
        </Text>

        <Title order={3}>5. Çerezler ve Teknik Veriler</Title>
        <Text size="sm">
          Oturum ve kimlik doğrulama amacıyla kullanılan çerezler ve benzeri teknik araçlar, güvenli oturum yönetimi için kullanılır; gerekli olanlar hizmetin sunulması için zorunludur.
        </Text>

        <Title order={3}>6. Şikayet</Title>
        <Text size="sm">
          Kişisel verilerinizin işlenmesi hakkındaki şikayetlerinizi Kişisel Verileri Koruma Kuruluna iletebilirsiniz.
        </Text>

        <Anchor component={Link} href="/login" size="sm" mt="md">
          Giriş sayfasına dön
        </Anchor>
      </Stack>
    </Container>
  );
}
