"use client";
import styles from "@/app/(afterLogin)/mainpage/_component/mypage.module.css";
import { useState, useEffect, useCallback } from "react";
import { useSession } from "next-auth/react";

// API 응답 타입 정의
interface UserInfoResponse {
  email: string;
  name: string;
  avatarKey: string;
  avatarVersion: number;
}

interface UserInfo {
  email: string;
  nickname: string;
  profileImage: string;
  joinDate: string;
  emailVerified: boolean;
}

export default function AccountSection() {
  const { data: session } = useSession();

  const [userInfo, setUserInfo] = useState<UserInfo>({
    email: "",
    nickname: "",
    profileImage: "/basicProfile.webp",
    joinDate: "2024.03.15",
    emailVerified: true,
  });

  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  const [currentPassword, setCurrentPassword] = useState<string>("");
  const [newPassword, setNewPassword] = useState<string>("");
  const [confirmPassword, setConfirmPassword] = useState<string>("");
  const [showPasswordChange, setShowPasswordChange] = useState<boolean>(false);
  const [passwordVerificationCode, setPasswordVerificationCode] = useState<string>("");
  const [, setIsPasswordCodeSent] = useState<boolean>(false);
  const [isPasswordCodeVerified, setIsPasswordCodeVerified] = useState<boolean>(false);

  const [newEmail, setNewEmail] = useState<string>("");
  const [emailVerificationCode, setEmailVerificationCode] = useState<string>("");
  const [isEmailCodeSent, setIsEmailCodeSent] = useState<boolean>(false);
  const [showEmailChange, setShowEmailChange] = useState<boolean>(false);

  // 회원정보 조회 API 함수
  const fetchUserInfo = useCallback(async (): Promise<void> => {
    try {
      setLoading(true);
      setError(null);

      const token = session?.accessToken;

      if (!token) {
        throw new Error("인증 토큰이 없습니다. 로그인이 필요합니다.");
      }

      if (!session?.isBackendAuthenticated) {
        if (session?.backendError?.hasError) {
          throw new Error(session.backendError.message || "백엔드 인증에 실패했습니다.");
        } else {
          throw new Error("백엔드 인증이 완료되지 않았습니다.");
        }
      }

      const response = await fetch(`${process.env.NEXT_PUBLIC_BACKEND_URL}/users/me`, {
        method: "GET",
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error("AccountSection: Error response:", errorText);

        if (response.status === 401) {
          throw new Error("인증이 만료되었습니다. 다시 로그인해주세요.");
        } else if (response.status === 403) {
          throw new Error("접근 권한이 없습니다.");
        } else {
          throw new Error(`서버 오류가 발생했습니다. (${response.status})`);
        }
      }

      const data: UserInfoResponse = await response.json();

      setUserInfo((prev) => ({
        ...prev,
        email: data.email,
        nickname: data.name,
        profileImage: data.avatarKey
          ? `${process.env.NEXT_PUBLIC_BACKEND_URL}/files/${data.avatarKey}?v=${data.avatarVersion}`
          : "/basicProfile.webp",
      }));
    } catch (err) {
      console.error("AccountSection: 회원정보를 가져오는데 실패했습니다:", err);
      setError(err instanceof Error ? err.message : "회원정보를 불러올 수 없습니다");
    } finally {
      setLoading(false);
    }
  }, [
    session?.accessToken,
    session?.isBackendAuthenticated,
    session?.backendError?.hasError,
    session?.backendError?.message,
  ]);

  useEffect(() => {
    if (session) {
      fetchUserInfo();
    }
  }, [session, fetchUserInfo]);

  const isSocialLogin = session?.provider && ["google", "kakao", "naver"].includes(session.provider);

  // 이메일 인증번호 발송 API (이메일 변경용)
  const sendEmailVerificationCode = useCallback(async (): Promise<void> => {
    try {
      const token = session?.accessToken;

      if (!token) {
        alert("인증 토큰이 없습니다. 로그인이 필요합니다.");
        return;
      }

      if (!session?.isBackendAuthenticated) {
        alert("백엔드 인증이 완료되지 않았습니다.");
        return;
      }

      const response = await fetch(`${process.env.NEXT_PUBLIC_BACKEND_URL}/email/send-code`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          email: newEmail,
          shouldAlreadyExists: false,
        }),
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error("인증번호 발송 실패:", errorText);

        if (response.status === 401) {
          alert("인증이 만료되었습니다. 다시 로그인해주세요.");
        } else if (response.status === 400) {
          alert("유효하지 않은 이메일 주소입니다.");
        } else if (response.status === 409) {
          alert("이미 사용 중인 이메일 주소입니다.");
        } else {
          alert(`서버 오류가 발생했습니다. (${response.status})`);
        }
        return;
      }

      setIsEmailCodeSent(true);
      alert("인증번호가 발송되었습니다!");
    } catch (error) {
      console.error("인증번호 발송 중 오류:", error);
      alert("네트워크 오류가 발생했습니다. 다시 시도해주세요.");
    }
  }, [session?.accessToken, session?.isBackendAuthenticated, newEmail]);

  // 이메일 인증번호 확인 및 이메일 변경 API
  const verifyEmailCodeAndUpdate = useCallback(async (): Promise<void> => {
    try {
      const token = session?.accessToken;

      if (!token) {
        alert("인증 토큰이 없습니다. 로그인이 필요합니다.");
        return;
      }

      if (!session?.isBackendAuthenticated) {
        alert("백엔드 인증이 완료되지 않았습니다.");
        return;
      }

      // 1단계: 인증번호 확인
      const verifyResponse = await fetch(`${process.env.NEXT_PUBLIC_BACKEND_URL}/email/verify-code`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          email: newEmail,
          code: emailVerificationCode,
        }),
      });

      if (!verifyResponse.ok) {
        const errorText = await verifyResponse.text();
        console.error("인증번호 확인 실패:", errorText);

        if (verifyResponse.status === 400) {
          alert("인증번호가 올바르지 않습니다.");
        } else if (verifyResponse.status === 401) {
          alert("인증이 만료되었습니다. 다시 로그인해주세요.");
        } else {
          alert("인증번호 확인에 실패했습니다.");
        }
        return;
      }

      // 2단계: 이메일 변경
      const updateResponse = await fetch(`${process.env.NEXT_PUBLIC_BACKEND_URL}/users/me/email`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          email: newEmail,
        }),
      });

      if (!updateResponse.ok) {
        const errorText = await updateResponse.text();
        console.error("이메일 변경 실패:", errorText);

        if (updateResponse.status === 400) {
          alert("유효하지 않은 이메일 주소입니다.");
        } else if (updateResponse.status === 401) {
          alert("인증이 만료되었습니다. 다시 로그인해주세요.");
        } else if (updateResponse.status === 409) {
          alert("이미 사용 중인 이메일 주소입니다.");
        } else {
          alert(`이메일 변경에 실패했습니다. (${updateResponse.status})`);
        }
        return;
      }

      setUserInfo((prev) => ({ ...prev, email: newEmail }));
      setNewEmail("");
      setEmailVerificationCode("");
      setIsEmailCodeSent(false);
      setShowEmailChange(false);
      alert("이메일이 성공적으로 변경되었습니다!");
    } catch (error) {
      console.error("이메일 변경 중 오류:", error);
      alert("네트워크 오류가 발생했습니다. 다시 시도해주세요.");
    }
  }, [session?.accessToken, session?.isBackendAuthenticated, newEmail, emailVerificationCode]);

  // 비밀번호 변경용 인증번호 발송 API
  const sendPasswordVerificationCode = useCallback(async (): Promise<void> => {
    try {
      const token = session?.accessToken;

      if (!token) {
        alert("인증 토큰이 없습니다. 로그인이 필요합니다.");
        return;
      }

      if (!session?.isBackendAuthenticated) {
        alert("백엔드 인증이 완료되지 않았습니다.");
        return;
      }

      const response = await fetch(`${process.env.NEXT_PUBLIC_BACKEND_URL}/email/send-code`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          email: userInfo.email,
          shouldAlreadyExists: true,
        }),
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error("인증번호 발송 실패:", errorText);

        if (response.status === 401) {
          alert("인증이 만료되었습니다. 다시 로그인해주세요.");
        } else if (response.status === 400) {
          alert("유효하지 않은 이메일 주소입니다.");
        } else {
          alert(`서버 오류가 발생했습니다. (${response.status})`);
        }
        return;
      }

      setIsPasswordCodeSent(true);
      alert("인증번호가 발송되었습니다!");
    } catch (error) {
      console.error("인증번호 발송 중 오류:", error);
      alert("네트워크 오류가 발생했습니다. 다시 시도해주세요.");
    }
  }, [session?.accessToken, session?.isBackendAuthenticated, userInfo.email]);

  // 비밀번호 변경용 인증번호 확인 API
  const verifyPasswordCode = useCallback(async (): Promise<void> => {
    try {
      const token = session?.accessToken;

      if (!token) {
        alert("인증 토큰이 없습니다. 로그인이 필요합니다.");
        return;
      }

      if (!session?.isBackendAuthenticated) {
        alert("백엔드 인증이 완료되지 않았습니다.");
        return;
      }

      const verifyResponse = await fetch(`${process.env.NEXT_PUBLIC_BACKEND_URL}/email/verify-code`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          email: userInfo.email,
          code: passwordVerificationCode,
        }),
      });

      if (!verifyResponse.ok) {
        const errorText = await verifyResponse.text();
        console.error("인증번호 확인 실패:", errorText);

        if (verifyResponse.status === 400) {
          alert("인증번호가 올바르지 않습니다.");
        } else if (verifyResponse.status === 401) {
          alert("인증이 만료되었습니다. 다시 로그인해주세요.");
        } else {
          alert("인증번호 확인에 실패했습니다.");
        }
        return;
      }

      setIsPasswordCodeVerified(true);
      alert("인증이 완료되었습니다! 비밀번호를 변경해주세요.");
    } catch (error) {
      console.error("인증번호 확인 중 오류:", error);
      alert("네트워크 오류가 발생했습니다. 다시 시도해주세요.");
    }
  }, [session?.accessToken, session?.isBackendAuthenticated, userInfo.email, passwordVerificationCode]);

  // 비밀번호 변경 API 함수
  const updatePassword = useCallback(async (): Promise<void> => {
    try {
      const token = session?.accessToken;

      if (!token) {
        alert("인증 토큰이 없습니다. 로그인이 필요합니다.");
        return;
      }

      if (!session?.isBackendAuthenticated) {
        alert("백엔드 인증이 완료되지 않았습니다.");
        return;
      }

      const response = await fetch(`${process.env.NEXT_PUBLIC_BACKEND_URL}/users/me/password`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          currentPassword: currentPassword,
          newPassword: newPassword,
        }),
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error("비밀번호 변경 실패:", errorText);

        if (response.status === 401) {
          alert("인증이 만료되었습니다. 다시 로그인해주세요.");
        } else if (response.status === 400) {
          alert("현재 비밀번호가 올바르지 않습니다.");
        } else if (response.status === 403) {
          alert("접근 권한이 없습니다.");
        } else {
          alert(`서버 오류가 발생했습니다. (${response.status})`);
        }
        return;
      }

      // 성공 시 입력 필드 초기화
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
      setPasswordVerificationCode("");
      setIsPasswordCodeSent(false);
      setIsPasswordCodeVerified(false);
      setShowPasswordChange(false);
      alert("비밀번호가 성공적으로 변경되었습니다!");
    } catch (error) {
      console.error("비밀번호 변경 중 오류:", error);
      alert("네트워크 오류가 발생했습니다. 다시 시도해주세요.");
    }
  }, [session?.accessToken, session?.isBackendAuthenticated, currentPassword, newPassword]);

  const handleEmailChange = (): void => {
    if (!newEmail.trim()) {
      alert("새 이메일을 입력해주세요.");
      return;
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(newEmail.trim())) {
      alert("올바른 이메일 형식을 입력해주세요.");
      return;
    }

    if (newEmail.trim() === userInfo.email) {
      alert("현재 이메일과 동일합니다. 다른 이메일을 입력해주세요.");
      return;
    }

    sendEmailVerificationCode();
  };

  const handleEmailVerify = (): void => {
    if (!emailVerificationCode.trim()) {
      alert("인증번호를 입력해주세요.");
      return;
    }

    if (emailVerificationCode.length !== 6) {
      alert("인증번호는 6자리입니다.");
      return;
    }

    verifyEmailCodeAndUpdate();
  };

  const handlePasswordVerificationStart = (): void => {
    // 비밀번호 변경 버튼 클릭 시 인증번호 발송
    sendPasswordVerificationCode();
  };

  const handlePasswordCodeVerify = (): void => {
    if (!passwordVerificationCode.trim()) {
      alert("인증번호를 입력해주세요.");
      return;
    }

    if (passwordVerificationCode.length !== 6) {
      alert("인증번호는 6자리입니다.");
      return;
    }

    verifyPasswordCode();
  };

  const handlePasswordChange = (): void => {
    if (!currentPassword.trim()) {
      alert("현재 비밀번호를 입력해주세요.");
      return;
    }

    if (!newPassword.trim()) {
      alert("새 비밀번호를 입력해주세요.");
      return;
    }

    if (!confirmPassword.trim()) {
      alert("비밀번호 확인을 입력해주세요.");
      return;
    }

    if (newPassword !== confirmPassword) {
      alert("새 비밀번호와 비밀번호 확인이 일치하지 않습니다.");
      return;
    }

    if (newPassword.length < 8) {
      alert("새 비밀번호는 8자 이상이어야 합니다.");
      return;
    }

    if (currentPassword === newPassword) {
      alert("새 비밀번호는 현재 비밀번호와 달라야 합니다.");
      return;
    }

    updatePassword();
  };

  if (loading) {
    return (
      <div className={styles.accountSection}>
        <div className={styles.sectionCard}>
          <h3 className={styles.sectionTitle}>계정 설정</h3>
          <div className={styles.loadingMessage}>계정 정보를 불러오는 중...</div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className={styles.accountSection}>
        <div className={styles.sectionCard}>
          <h3 className={styles.sectionTitle}>계정 설정</h3>
          <div className={styles.errorMessage}>
            <p>{error}</p>
            <button onClick={fetchUserInfo} className={styles.retryButton}>
              다시 시도
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={styles.accountSection}>
      <div className={styles.sectionCard}>
        <h3 className={styles.sectionTitle}>계정 설정</h3>

        {isSocialLogin ? (
          <div className={styles.socialLoginNotice}>
            <div className={styles.socialLoginContent}>
              <h4 className={styles.socialLoginTitle}>
                {session?.provider === "google" && "Google"}
                {session?.provider === "kakao" && "카카오"}
                {session?.provider === "naver" && "네이버"} 계정으로 로그인
              </h4>
              <p className={styles.socialLoginDescription}>
                소셜 로그인을 사용하여 로그인하셨습니다.
                <br />
                계정 정보 변경은 해당 소셜 서비스에서 직접 수정해주세요.
              </p>
            </div>
          </div>
        ) : (
          <>
            <div className={styles.settingItem}>
              <div className={styles.settingInfo}>
                <span className={styles.settingLabel}>이메일</span>
                <span className={styles.settingValue}>{userInfo.email}</span>
              </div>
              <button className={styles.settingBtn} onClick={() => setShowEmailChange(!showEmailChange)} type="button">
                변경
              </button>
            </div>

            {showEmailChange && (
              <div className={styles.emailChangeForm}>
                <input
                  type="email"
                  value={newEmail}
                  onChange={(e) => setNewEmail(e.target.value)}
                  placeholder="새 이메일 주소"
                  className={styles.emailInput}
                />

                <button
                  className={styles.emailVerifyBtn}
                  onClick={handleEmailChange}
                  disabled={!newEmail || isEmailCodeSent}
                  type="button"
                >
                  {isEmailCodeSent ? "인증번호 발송됨" : "인증번호 발송"}
                </button>

                {isEmailCodeSent && (
                  <div className={styles.verificationSection}>
                    <input
                      type="text"
                      value={emailVerificationCode}
                      onChange={(e) => setEmailVerificationCode(e.target.value)}
                      placeholder="인증번호 6자리"
                      maxLength={6}
                      className={styles.verificationInput}
                    />
                    <button
                      className={styles.confirmBtn}
                      onClick={handleEmailVerify}
                      disabled={!emailVerificationCode}
                      type="button"
                    >
                      인증하기
                    </button>
                    <p className={styles.testCode}>인증번호를 이메일로 확인해주세요</p>
                  </div>
                )}

                <div className={styles.emailActions}>
                  <button
                    className={styles.cancelBtn}
                    onClick={() => {
                      setShowEmailChange(false);
                      setNewEmail("");
                      setEmailVerificationCode("");
                      setIsEmailCodeSent(false);
                    }}
                    type="button"
                  >
                    취소
                  </button>
                </div>
              </div>
            )}

            <div className={styles.settingItem}>
              <div className={styles.settingInfo}>
                <span className={styles.settingLabel}>비밀번호</span>
                <span className={styles.settingValue}>••••••••</span>
              </div>
              <button
                className={styles.settingBtn}
                onClick={() => {
                  setShowPasswordChange(!showPasswordChange);
                  if (!showPasswordChange) {
                    // 비밀번호 변경 폼을 열 때 인증번호 발송
                    handlePasswordVerificationStart();
                  }
                }}
                type="button"
              >
                변경
              </button>
            </div>
            {showPasswordChange && (
              <div className={styles.passwordChangeForm}>
                {!isPasswordCodeVerified ? (
                  // 인증번호 입력 단계
                  <div className={styles.verificationSection}>
                    <p className={styles.verificationInfo}>
                      가입하신 이메일({userInfo.email})로 인증번호를 발송했습니다.
                    </p>
                    <input
                      type="text"
                      value={passwordVerificationCode}
                      onChange={(e) => setPasswordVerificationCode(e.target.value)}
                      placeholder="인증번호 6자리"
                      maxLength={6}
                      className={styles.verificationInput}
                    />
                    <button
                      className={styles.confirmBtn}
                      onClick={handlePasswordCodeVerify}
                      disabled={!passwordVerificationCode}
                      type="button"
                    >
                      인증 확인
                    </button>
                  </div>
                ) : (
                  // 비밀번호 변경 단계
                  <>
                    <input
                      type="password"
                      value={currentPassword}
                      onChange={(e) => setCurrentPassword(e.target.value)}
                      placeholder="현재 비밀번호"
                      className={styles.passwordInput}
                    />
                    <input
                      type="password"
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                      placeholder="새 비밀번호 (8자 이상)"
                      className={styles.passwordInput}
                    />
                    <input
                      type="password"
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      placeholder="비밀번호 재확인"
                      className={styles.passwordInput}
                    />
                  </>
                )}

                <div className={styles.passwordActions}>
                  <button
                    className={styles.cancelBtn}
                    onClick={() => {
                      setShowPasswordChange(false);
                      setCurrentPassword("");
                      setNewPassword("");
                      setConfirmPassword("");
                      setPasswordVerificationCode("");
                      setIsPasswordCodeSent(false);
                      setIsPasswordCodeVerified(false);
                    }}
                    type="button"
                  >
                    취소
                  </button>
                  {isPasswordCodeVerified && (
                    <button className={styles.confirmBtn} onClick={handlePasswordChange} type="button">
                      변경하기
                    </button>
                  )}
                </div>
              </div>
            )}

            <div className={styles.settingItem}>
              <div className={styles.settingInfo}>
                <span className={styles.settingLabel}>이메일 인증</span>
                <span
                  className={`${styles.settingValue} ${userInfo.emailVerified ? styles.verified : styles.unverified}`}
                >
                  {userInfo.emailVerified ? "인증 완료" : "미인증"}
                </span>
              </div>
              {!userInfo.emailVerified && (
                <button className={styles.settingBtn} type="button">
                  인증하기
                </button>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
