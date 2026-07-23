"use client";

import { useEffect, useRef } from "react";
import Link from "next/link";
import styles from "./body.module.css";
import DarkVeil from "@/app/_component/DarkVeil";

export default function Body() {
  const backgroundRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleScroll = () => {
      if (backgroundRef.current) {
        const scrollY = window.scrollY;
        backgroundRef.current.style.transform = `translateY(${scrollY * 0.5}px)`;
      }
    };

    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  return (
    <>
      {/* 애니메이션 배경 */}
      <div ref={backgroundRef} className={styles.backgroundContainer}>
        <DarkVeil />
      </div>

      {/* 메인 컨텐츠 컨테이너 */}
      <div className={styles.container}>
        <div className={styles.content}>
          <h1 className={styles.mainTitle}>Teaming</h1>
          <h1 className={styles.mainTitle2}>For Your Team</h1>
          <p className={styles.subtitle}>효율적인 소통과 유연한 협력을 통해</p>
          <p className={styles.subtitle}>여러분의 과제와 프로젝트가 더 쉬워지고 더 특별해집니다</p>

          <div className={styles.buttonGroup}>
            <Link href="/login" className={styles.loginButton}>
              로그인
            </Link>
            <Link href="/signup" className={styles.joinButton}>
              회원가입
            </Link>
          </div>
        </div>
      </div>
    </>
  );
}
