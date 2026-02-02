import React from "react";

export const metadata = {
  title:
    "Pengaruh Motivasi dan Fatiga Muskular Pasca-Latihan Beban terhadap Performa Belajar Mahasiswa",
  description:
    "Analisis motivasi intrinsik dan fatiga muskular pasca-latihan beban terhadap performa belajar mahasiswa UIN Jakarta.",
};

export default function Page() {
  return (
    <main className="relative mx-auto max-w-3xl px-6 py-20">
      {/* Header */}
      <header className="mb-16 space-y-6">
        <span className="text-sm font-medium text-muted-foreground">
          Artikel Ilmiah · Penelitian Kuantitatif
        </span>

        <h1 className="text-3xl font-semibold leading-tight tracking-tight">
          Pengaruh Motivasi dan Fatiga Muskular Pasca-Latihan Beban terhadap
          Performa Belajar Mahasiswa UIN Jakarta
        </h1>

        <div className="space-y-1 text-sm text-muted-foreground">
          <p>
            Javas Anggaraksa Rabbani · Rasyid Ali Nurhakim · Saskia Hanina
            Sadiyah
          </p>
          <p>
            Fakultas Hukum UNTIRTA · Fakultas Ilmu Kesehatan UIN Jakarta · FISIP
            UNSOED
          </p>
        </div>
      </header>

      {/* Content */}
      <article className="prose prose-neutral max-w-none dark:prose-invert">
        <h2>Abstrak</h2>
        <p>
          Penelitian ini bertujuan untuk menganalisis pengaruh motivasi intrinsik
          dan fatiga muskular pasca-latihan beban terhadap performa belajar
          mahasiswa UIN Jakarta. Pengumpulan data dilakukan melalui survei
          terhadap 123 mahasiswa aktif yang rutin melakukan latihan beban
          menggunakan kuesioner skala Likert.
        </p>
        <p>
          Hasil penelitian menunjukkan bahwa 55,3% responden memiliki motivasi
          intrinsik tinggi, namun 38,2% mengalami fatiga muskular tingkat tinggi
          pasca-latihan. Fatiga muskular berkaitan dengan penurunan fokus,
          konsentrasi, dan kemampuan memahami materi akademik. Motivasi intrinsik
          berperan sebagai faktor protektif yang membantu mahasiswa beradaptasi
          terhadap kelelahan fisik.
        </p>

        <h2>Pendahuluan</h2>
        <p>
          Aktivitas fisik merupakan determinan penting dalam menjaga kesehatan
          fisik dan mental individu. Di lingkungan pendidikan tinggi, latihan
          beban menjadi aktivitas yang semakin diminati mahasiswa sebagai
          bagian dari gaya hidup dan pembentukan identitas diri.
        </p>
        <p>
          Penelitian sebelumnya menunjukkan bahwa latihan beban berdampak
          positif terhadap fungsi kognitif, namun praktik latihan dengan
          intensitas tinggi tanpa pemulihan memadai berpotensi menimbulkan
          fatiga muskular yang memengaruhi performa belajar.
        </p>

        <h2>Metode Penelitian</h2>
        <p>
          Penelitian ini menggunakan pendekatan kuantitatif dengan desain survei
          cross-sectional. Subjek penelitian terdiri dari 123 mahasiswa aktif
          UIN Syarif Hidayatullah Jakarta yang rutin melakukan latihan beban
          minimal satu kali per minggu.
        </p>
        <p>
          Data dikumpulkan melalui kuesioner skala Likert lima tingkat yang
          mengukur motivasi intrinsik, fatiga muskular pasca-latihan, dan
          performa belajar berbasis persepsi subjektif mahasiswa.
        </p>

        <h2>Hasil dan Pembahasan</h2>
        <p>
          Sebanyak 55,3% responden menunjukkan motivasi intrinsik tinggi, dengan
          rerata skor 3,86. Sementara itu, 38,2% responden mengalami fatiga
          muskular tingkat tinggi yang berkorelasi dengan penurunan konsentrasi
          dan fokus belajar.
        </p>
        <p>
          Temuan ini menunjukkan efek ganda latihan beban: motivasi intrinsik
          mendukung regulasi diri akademik, sedangkan fatiga muskular berpotensi
          menghambat performa belajar jangka pendek apabila tidak diimbangi
          pemulihan yang memadai.
        </p>

        <h2>Keterbatasan Penelitian</h2>
        <p>
          Penelitian ini menggunakan pengukuran performa belajar berbasis
          persepsi subjektif tanpa data objektif seperti IP semester atau tes
          kognitif terstandar. Selain itu, desain cross-sectional membatasi
          kesimpulan kausal.
        </p>

        <h2>Kesimpulan</h2>
        <p>
          Motivasi intrinsik dan fatiga muskular pasca-latihan beban berpengaruh
          simultan terhadap performa belajar mahasiswa. Motivasi intrinsik
          berperan sebagai faktor protektif, sementara fatiga muskular menjadi
          faktor penghambat apabila intensitas latihan tidak dikelola dengan
          baik.
        </p>

        <h2>Daftar Pustaka</h2>
        <ul>
          <li>Ryan, R. M., & Deci, E. L. (2000).</li>
          <li>Teixeira, P. J., et al. (2012).</li>
          <li>Robinson, K. J., et al. (2023).</li>
          <li>Donate-Martínez, M. P., et al. (2024).</li>
        </ul>
      </article>
    </main>
  );
}
