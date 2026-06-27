'use client';

import Link from 'next/link';
import { useMemo } from 'react';
import Image from 'next/image';
import styles from './page.module.css';

export default function HomePage() {
  const imagePath = useMemo(() => {
    const randomNumber = Math.floor(Math.random() * 5) + 1;
    return `/assets/images/${randomNumber}.png`;
  }, []);

  return (
    <div className={styles.heroContainer}>
      <div className={styles.headerContainer}>
        <h1 className={styles.headerTitle}>Upload Photos</h1>
        <p className={styles.headerSubtitle}>Upload selfies, memes, or any fun pictures here.</p>
      </div>

      <Link href="/upload" className={styles.heroButton}>
        TAIL-ENT SHOWCASE
      </Link>

      <div className={styles.heroImageWrapper}>
        <Image
          src={imagePath}
          alt="Hero image"
          className={styles.heroImage}
          width={426}
          height={600}
        />
      </div>
    </div>
  );
}
