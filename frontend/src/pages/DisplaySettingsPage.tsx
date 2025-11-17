import { useState } from 'react';
import {
  Box,
  Typography,
  Container,
  Paper,
  FormControl,
  FormLabel,
  RadioGroup,
  FormControlLabel,
  Radio,
  Switch,
  Button,
  Divider,
  Alert,
} from '@mui/material';
import { Save } from '@mui/icons-material';
import { MainLayout } from '@/layouts/MainLayout';

// ============================================================
// DisplaySettingsPage (A-005)
// ============================================================
// 表示設定ページ
// - 展開図表示切り替え（表示/非表示）
// - パーツ画像表示切り替え（表示/非表示）
// - 画像位置選択（左端/右端）
// ============================================================

interface DisplaySettings {
  showDiagram: boolean;
  showPartImages: boolean;
  imagePosition: 'left' | 'right';
}

// TODO: バックエンド実装後、APIから取得・保存
const INITIAL_SETTINGS: DisplaySettings = {
  showDiagram: true,
  showPartImages: true,
  imagePosition: 'left',
};

export const DisplaySettingsPage = () => {
  const [settings, setSettings] = useState<DisplaySettings>(INITIAL_SETTINGS);
  const [saved, setSaved] = useState(false);

  const handleShowDiagramChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    setSettings({ ...settings, showDiagram: event.target.checked });
    setSaved(false);
  };

  const handleShowPartImagesChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    setSettings({ ...settings, showPartImages: event.target.checked });
    setSaved(false);
  };

  const handleImagePositionChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    setSettings({ ...settings, imagePosition: event.target.value as 'left' | 'right' });
    setSaved(false);
  };

  const handleSave = () => {
    // TODO: バックエンド実装後、APIに保存
    console.log('Saving settings:', settings);
    setSaved(true);

    // 3秒後にメッセージを非表示
    setTimeout(() => {
      setSaved(false);
    }, 3000);
  };

  return (
    <MainLayout>
      <Container maxWidth="md">
        <Box sx={{ mb: 4 }}>
          <Typography variant="h4" gutterBottom sx={{ fontWeight: 600 }}>
            表示設定
          </Typography>
          <Typography variant="body2" color="text.secondary">
            パーツリストページの画像表示をカスタマイズできます
          </Typography>
        </Box>

        {saved && (
          <Alert severity="success" sx={{ mb: 3 }}>
            設定を保存しました
          </Alert>
        )}

        <Paper elevation={2} sx={{ p: 4 }}>
          {/* 展開図表示設定 */}
          <Box sx={{ mb: 4 }}>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <Box>
                <Typography variant="h6" gutterBottom sx={{ fontWeight: 600 }}>
                  展開図表示
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  パーツリストページの上部に展開図を表示します
                </Typography>
              </Box>
              <Switch
                checked={settings.showDiagram}
                onChange={handleShowDiagramChange}
                color="primary"
                size="medium"
              />
            </Box>
          </Box>

          <Divider sx={{ my: 3 }} />

          {/* パーツ画像表示設定 */}
          <Box sx={{ mb: 4 }}>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <Box>
                <Typography variant="h6" gutterBottom sx={{ fontWeight: 600 }}>
                  パーツ画像表示
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  パーツリストの各行に小さい画像を表示します
                </Typography>
              </Box>
              <Switch
                checked={settings.showPartImages}
                onChange={handleShowPartImagesChange}
                color="primary"
                size="medium"
              />
            </Box>
          </Box>

          <Divider sx={{ my: 3 }} />

          {/* 画像位置設定 */}
          <Box sx={{ mb: 4 }}>
            <FormControl component="fieldset" fullWidth>
              <FormLabel component="legend" sx={{ mb: 2 }}>
                <Typography variant="h6" sx={{ fontWeight: 600, color: 'text.primary' }}>
                  画像位置
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  パーツ画像を表示する位置を選択します
                </Typography>
              </FormLabel>
              <RadioGroup
                value={settings.imagePosition}
                onChange={handleImagePositionChange}
              >
                <FormControlLabel
                  value="left"
                  control={<Radio />}
                  label={
                    <Box>
                      <Typography variant="body1">左端</Typography>
                      <Typography variant="body2" color="text.secondary">
                        パーツ画像をテーブルの左端に表示
                      </Typography>
                    </Box>
                  }
                  sx={{ mb: 2 }}
                />
                <FormControlLabel
                  value="right"
                  control={<Radio />}
                  label={
                    <Box>
                      <Typography variant="body1">右端</Typography>
                      <Typography variant="body2" color="text.secondary">
                        パーツ画像をテーブルの右端に表示
                      </Typography>
                    </Box>
                  }
                />
              </RadioGroup>
            </FormControl>
          </Box>

          <Divider sx={{ my: 3 }} />

          {/* 保存ボタン */}
          <Box sx={{ display: 'flex', justifyContent: 'flex-end' }}>
            <Button
              variant="contained"
              size="large"
              startIcon={<Save />}
              onClick={handleSave}
            >
              設定を保存
            </Button>
          </Box>
        </Paper>

        {/* プレビュー説明 */}
        <Box sx={{ mt: 3 }}>
          <Typography variant="body2" color="text.secondary" sx={{ fontStyle: 'italic' }}>
            ※ 設定を保存すると、パーツリストページに即座に反映されます
          </Typography>
        </Box>
      </Container>
    </MainLayout>
  );
};
