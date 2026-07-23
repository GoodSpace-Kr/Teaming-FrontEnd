import TextType from "@/app/_component/TextType";
import styles from "./review.module.css";

export default function Review() {
  return (
    <>
      <div className={styles.container}>
        <TextType
          text="함께한 사람들의 목소리"
          typingSpeed={100}
          pauseDuration={2000}
          showCursor={true}
          cursorCharacter="|"
          className={styles.textType}
          loop={false}
          initialDelay={500}
        />
      </div>
    </>
  );
}
