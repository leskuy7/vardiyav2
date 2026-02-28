"use client";

import {
  ActionIcon,
  Alert,
  Badge,
  Box,
  Button,
  Container,
  Grid,
  Group,
  Paper,
  Stack,
  Text,
  TextInput,
  Title,
} from "@mantine/core";
import { IconArrowRight, IconEye, IconEyeOff, IconAt } from "@tabler/icons-react";
import { AxiosError } from "axios";
import React, { useEffect, useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { ThemeToggle } from "../../components/theme-toggle";
import { useAuth } from "../../hooks/use-auth";
import { api } from "../../lib/api";
import { setAccessToken } from "../../lib/token-store";

export default function LoginPage() {
  const router = useRouter();
  const { data: user, isLoading: isAuthLoading } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const formRef = React.useRef<HTMLFormElement>(null);

  const demoAccounts = [
    {
      label: "Admin",
      email: "admin@test.local",
      password: "Test12345!",
      color: "indigo",
    },
    {
      label: "Müdür",
      email: "manager@test.local",
      password: "Test12345!",
      color: "violet",
    },
    {
      label: "Çalışan",
      email: "employee@test.local",
      password: "Test12345!",
      color: "grape",
    },
  ];

  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }

    const demo = new URLSearchParams(window.location.search).get("demo");
    const selected =
      demo === "admin"
        ? demoAccounts[0]
        : demo === "manager"
          ? demoAccounts[1]
          : demo === "employee"
            ? demoAccounts[2]
            : null;

    if (selected) {
      setEmail(selected.email);
      setPassword(selected.password);
      setTimeout(() => {
        formRef.current?.requestSubmit();
      }, 300);
    }
  }, []);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setSubmitting(true);

    try {
      const response = await api.post("/auth/login", { email, password });
      setAccessToken(response.data.accessToken);
      const role = response.data.user?.role as "ADMIN" | "MANAGER" | "EMPLOYEE";
      router.push(role === "EMPLOYEE" ? "/my-shifts" : "/dashboard");
    } catch (caughtError) {
      const axiosError = caughtError as AxiosError<{ message?: string }>;
      setError(axiosError.response?.data?.message ?? "Giriş başarısız.");
    } finally {
      setSubmitting(false);
    }
  }

  useEffect(() => {
    if (user) {
      router.replace(user.role === "EMPLOYEE" ? "/my-shifts" : "/dashboard");
    }
  }, [user, router]);

  if (isAuthLoading || user) {
    return (
      <Box
        style={{
          minHeight: "100vh",
          background: "var(--gradient-hero)",
          display: "flex",
          alignItems: "center",
          position: "relative",
          overflow: "hidden",
        }}
      >
        <Box
          style={{
            position: "absolute",
            top: "-20%",
            right: "-10%",
            width: 500,
            height: 500,
            borderRadius: "50%",
            background:
              "radial-gradient(circle, rgba(102, 126, 234, 0.15) 0%, transparent 70%)",
            animation: "float 8s ease-in-out infinite",
            pointerEvents: "none",
          }}
        />
        <Box
          style={{
            position: "absolute",
            bottom: "-20%",
            left: "-15%",
            width: 400,
            height: 400,
            borderRadius: "50%",
            background:
              "radial-gradient(circle, rgba(118, 75, 162, 0.12) 0%, transparent 70%)",
            animation: "float 10s ease-in-out infinite reverse",
            pointerEvents: "none",
          }}
        />
      </Box>
    );
  }

  return (
    <Box
      style={{
        minHeight: "100vh",
        background: "var(--gradient-hero)",
        display: "flex",
        alignItems: "center",
        position: "relative",
        overflow: "hidden",
      }}
    >
      {/* Background orbs */}
      <Box
        style={{
          position: "absolute",
          top: "-20%",
          right: "-10%",
          width: 500,
          height: 500,
          borderRadius: "50%",
          background:
            "radial-gradient(circle, rgba(102, 126, 234, 0.15) 0%, transparent 70%)",
          animation: "float 8s ease-in-out infinite",
          pointerEvents: "none",
        }}
      />
      <Box
        style={{
          position: "absolute",
          bottom: "-20%",
          left: "-15%",
          width: 400,
          height: 400,
          borderRadius: "50%",
          background:
            "radial-gradient(circle, rgba(118, 75, 162, 0.12) 0%, transparent 70%)",
          animation: "float 10s ease-in-out infinite reverse",
          pointerEvents: "none",
        }}
      />

      <Container
        size="lg"
        style={{ position: "relative", zIndex: 1, width: "100%" }}
      >
        <Stack align="flex-end" mb="md">
          <ThemeToggle />
        </Stack>

        <Paper
          radius="xl"
          p={{ base: "lg", md: "xl" }}
          maw={980}
          mx="auto"
          style={{
            background: "rgba(255, 255, 255, 0.06)",
            backdropFilter: "blur(20px)",
            border: "1px solid rgba(255, 255, 255, 0.1)",
            boxShadow: "0 16px 64px rgba(0, 0, 0, 0.3)",
          }}
        >
          <Grid gutter="xl" align="stretch">
            <Grid.Col span={{ base: 12, md: 5 }}>
              <Stack justify="center" h="100%" gap="md" className="page-enter">
                <Badge
                  variant="light"
                  w="fit-content"
                  size="lg"
                  style={{
                    background: "rgba(102, 126, 234, 0.2)",
                    color: "#a5b4fc",
                  }}
                >
                  Vardiya Platformu
                </Badge>
                <Title
                  order={1}
                  style={{
                    color: "#ffffff",
                    fontSize: "clamp(1.6rem, 3vw, 2.4rem)",
                    letterSpacing: "-0.02em",
                  }}
                >
                  Operasyonunu{" "}
                  <span className="gradient-text">tek panelden</span> yönet
                </Title>
                <Text style={{ color: "rgba(199, 210, 254, 0.7)" }} lh={1.7}>
                  Vardiya atama, raporlama, çalışan takibi ve onay süreçlerini
                  merkezi olarak yönet.
                </Text>
              </Stack>
            </Grid.Col>

            <Grid.Col span={{ base: 12, md: 7 }}>
              <Paper
                radius="xl"
                p="xl"
                style={{
                  background: "rgba(255, 255, 255, 0.04)",
                  border: "1px solid rgba(255, 255, 255, 0.08)",
                }}
              >
                <form ref={formRef} onSubmit={handleSubmit}>
                  <Stack>
                    <Group justify="space-between" align="center">
                      <Title order={3} style={{ color: "#fff" }}>
                        Giriş Yap
                      </Title>
                      <Badge
                        variant="light"
                        style={{
                          background: "rgba(102, 126, 234, 0.3)",
                          color: "#a5b4fc",
                        }}
                      >
                        BETA
                      </Badge>
                    </Group>

                    <TextInput
                      label="Kullanıcı Adı / E-posta"
                      description="Size verilen 6 haneli kod veya e-postanız ile giriş yapın"
                      placeholder="örn. a1b2c3 veya admin@shiftplanner.com"
                      name="email"
                      autoComplete="username"
                      autoCapitalize="none"
                      spellCheck={false}
                      leftSection={<IconAt size={18} />}
                      size="md"
                      radius="lg"
                      value={email}
                      onChange={(event) => setEmail(event.target.value)}
                      required
                      styles={{
                        input: {
                          background: "rgba(255, 255, 255, 0.06)",
                          borderColor: "rgba(255, 255, 255, 0.1)",
                          color: "#e0e7ff",
                          "&::placeholder": {
                            color: "rgba(199, 210, 254, 0.4)",
                          },
                        },
                        label: { color: "#c7d2fe" },
                        description: { color: "rgba(199, 210, 254, 0.5)" },
                      }}
                    />

                    <TextInput
                      label="Şifre"
                      placeholder="Şifren"
                      type={showPassword ? "text" : "password"}
                      name="password"
                      autoComplete="current-password"
                      size="md"
                      radius="lg"
                      value={password}
                      onChange={(event) => setPassword(event.target.value)}
                      rightSection={
                        <ActionIcon
                          variant="subtle"
                          color="gray"
                          onClick={() => setShowPassword((value) => !value)}
                          aria-label={
                            showPassword ? "Şifreyi gizle" : "Şifreyi göster"
                          }
                        >
                          {showPassword ? (
                            <IconEyeOff size={16} />
                          ) : (
                            <IconEye size={16} />
                          )}
                        </ActionIcon>
                      }
                      required
                      styles={{
                        input: {
                          background: "rgba(255, 255, 255, 0.06)",
                          borderColor: "rgba(255, 255, 255, 0.1)",
                          color: "#e0e7ff",
                        },
                        label: { color: "#c7d2fe" },
                      }}
                    />

                    <Button
                      type="submit"
                      fullWidth
                      size="md"
                      loading={submitting}
                      className="btn-gradient"
                      rightSection={
                        !submitting ? <IconArrowRight size={18} /> : undefined
                      }
                    >
                      Giriş Yap
                    </Button>

                    <Stack gap="xs">
                      <Text
                        size="xs"
                        ta="center"
                        style={{ color: "rgba(199, 210, 254, 0.5)" }}
                      >
                        Demo Hesaplar
                      </Text>
                      <Group grow>
                        {demoAccounts.map((account) => (
                          <Button
                            key={account.label}
                            variant="default"
                            type="button"
                            style={{
                              background: "rgba(255, 255, 255, 0.06)",
                              borderColor: "rgba(255, 255, 255, 0.1)",
                              color: "#c7d2fe",
                            }}
                            onClick={() => {
                              setEmail(account.email);
                              setPassword(account.password);
                            }}
                          >
                            {account.label}
                          </Button>
                        ))}
                      </Group>
                    </Stack>

                    <Text
                      size="xs"
                      ta="center"
                      style={{ color: "rgba(199, 210, 254, 0.4)" }}
                    >
                      Hesaplar yalnızca sistem yöneticisi tarafından
                      oluşturulur.
                    </Text>

                    {error ? (
                      <Alert color="red" radius="md">
                        {error}
                      </Alert>
                    ) : null}
                  </Stack>
                </form>
              </Paper>
            </Grid.Col>
          </Grid>
        </Paper>
      </Container>
    </Box>
  );
}
