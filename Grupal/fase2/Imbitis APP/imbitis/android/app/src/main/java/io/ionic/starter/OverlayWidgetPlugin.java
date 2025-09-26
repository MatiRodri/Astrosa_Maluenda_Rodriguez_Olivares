package io.ionic.starter;

import android.content.Context;
import android.content.Intent;
import android.graphics.PixelFormat;
import android.net.Uri;
import android.os.Build;
import android.provider.Settings;
import android.view.Gravity;
import android.view.LayoutInflater;
import android.view.MotionEvent;
import android.view.View;
import android.view.WindowManager;

import androidx.annotation.Nullable;

import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.annotation.CapacitorPlugin;

import java.util.concurrent.CountDownLatch;
import java.util.concurrent.TimeUnit;
import java.util.concurrent.atomic.AtomicBoolean;

import io.ionic.starter.R;

@CapacitorPlugin(name = "OverlayWidget")
public class OverlayWidgetPlugin extends Plugin {
  private static final int REQUEST_OVERLAY_PERMISSION = 1337;
  private static final String PREF_FILE = "ImbitisWidgetPrefs";
  private static final String KEY_WIDGET_ENABLED = "widgetEnabled";

  private PluginCall pendingPermissionCall;
  private WindowManager windowManager;
  private View overlayView;
  private WindowManager.LayoutParams overlayParams;

  @Override
  public void load() {
    super.load();
    if (isWidgetEnabled() && hasOverlayPermission()) {
      boolean shown = showOverlay();
      if (!shown) {
        setWidgetPreference(false);
      }
    }
  }

  public void enable(PluginCall call) {
    boolean success = false;
    if (hasOverlayPermission()) {
      success = showOverlay();
    }
    setWidgetPreference(success);
    call.resolve();
  }

  public void disable(PluginCall call) {
    setWidgetPreference(false);
    hideOverlay();
    call.resolve();
  }

  public void getState(PluginCall call) {
    JSObject result = new JSObject();
    result.put("enabled", isWidgetEnabled());
    result.put("granted", hasOverlayPermission());
    call.resolve(result);
  }

  public void hasPermission(PluginCall call) {
    JSObject result = new JSObject();
    result.put("granted", hasOverlayPermission());
    call.resolve(result);
  }

  public void requestPermission(PluginCall call) {
    if (Build.VERSION.SDK_INT < Build.VERSION_CODES.M) {
      JSObject result = new JSObject();
      result.put("granted", true);
      call.resolve(result);
      return;
    }

    if (hasOverlayPermission()) {
      JSObject result = new JSObject();
      result.put("granted", true);
      call.resolve(result);
      return;
    }

    Intent intent = new Intent(
        Settings.ACTION_MANAGE_OVERLAY_PERMISSION,
        Uri.parse("package:" + getContext().getPackageName())
    );
    pendingPermissionCall = call;
    startActivityForResult(call, intent, REQUEST_OVERLAY_PERMISSION);
  }

  @Override
  protected void handleOnActivityResult(int requestCode, int resultCode, @Nullable Intent data) {
    super.handleOnActivityResult(requestCode, resultCode, data);
    if (requestCode == REQUEST_OVERLAY_PERMISSION && pendingPermissionCall != null) {
      boolean granted = hasOverlayPermission();
      JSObject result = new JSObject();
      result.put("granted", granted);
      pendingPermissionCall.resolve(result);
      pendingPermissionCall = null;
      if (!granted) {
        setWidgetPreference(false);
        hideOverlay();
      } else if (isWidgetEnabled()) {
        boolean shown = showOverlay();
        if (!shown) {
          setWidgetPreference(false);
        }
      }
    }
  }

  @Override
  protected void handleOnPause() {
    super.handleOnPause();
    // keep overlay visible, no action needed
  }

  @Override
  protected void handleOnDestroy() {
    super.handleOnDestroy();
    hideOverlay();
  }

  private boolean showOverlay() {
    if (!hasOverlayPermission()) {
      return false;
    }

    final Context context = getContext();
    if (context == null) {
      return false;
    }

    if (overlayView != null) {
      return true;
    }

    CountDownLatch latch = new CountDownLatch(1);
    AtomicBoolean success = new AtomicBoolean(false);

    getBridge().executeOnMainThread(() -> {
      try {
        windowManager = (WindowManager) context.getSystemService(Context.WINDOW_SERVICE);
        if (windowManager == null) {
          return;
        }

        LayoutInflater inflater = LayoutInflater.from(context);
        overlayView = inflater.inflate(R.layout.overlay_widget_layout, null);

        View button = overlayView.findViewById(R.id.overlay_container);
        if (button != null) {
          button.setOnClickListener(v -> {
            Intent intent = new Intent(context, MainActivity.class);
            intent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK | Intent.FLAG_ACTIVITY_CLEAR_TOP);
            context.startActivity(intent);
          });
        }

        int layoutType = Build.VERSION.SDK_INT >= Build.VERSION_CODES.O
            ? WindowManager.LayoutParams.TYPE_APPLICATION_OVERLAY
            : WindowManager.LayoutParams.TYPE_PHONE;

        overlayParams = new WindowManager.LayoutParams(
            WindowManager.LayoutParams.WRAP_CONTENT,
            WindowManager.LayoutParams.WRAP_CONTENT,
            layoutType,
            WindowManager.LayoutParams.FLAG_NOT_FOCUSABLE
                | WindowManager.LayoutParams.FLAG_LAYOUT_IN_SCREEN
                | WindowManager.LayoutParams.FLAG_LAYOUT_NO_LIMITS
                | WindowManager.LayoutParams.FLAG_NOT_TOUCH_MODAL,
            PixelFormat.TRANSLUCENT
        );
        overlayParams.gravity = Gravity.TOP | Gravity.END;
        overlayParams.x = 48;
        overlayParams.y = 200;

        setupDrag(overlayView);

        windowManager.addView(overlayView, overlayParams);
        success.set(true);
      } catch (Exception ex) {
        overlayView = null;
      } finally {
        latch.countDown();
      }
    });

    try {
      latch.await(500, TimeUnit.MILLISECONDS);
    } catch (InterruptedException e) {
      Thread.currentThread().interrupt();
    }

    return success.get();
  }

  private void hideOverlay() {
    if (overlayView == null || windowManager == null) {
      overlayView = null;
      return;
    }

    CountDownLatch latch = new CountDownLatch(1);
    getBridge().executeOnMainThread(() -> {
      try {
        windowManager.removeViewImmediate(overlayView);
      } catch (Exception ignored) {
        // ignore
      } finally {
        overlayView = null;
        latch.countDown();
      }
    });

    try {
      latch.await(500, TimeUnit.MILLISECONDS);
    } catch (InterruptedException e) {
      Thread.currentThread().interrupt();
    }
  }

  private void setupDrag(View view) {
    if (view == null) {
      return;
    }

    view.setOnTouchListener(new View.OnTouchListener() {
      private int initialX;
      private int initialY;
      private float initialTouchX;
      private float initialTouchY;

      @Override
      public boolean onTouch(View v, MotionEvent event) {
        if (overlayParams == null || windowManager == null) {
          return false;
        }

        switch (event.getAction()) {
          case MotionEvent.ACTION_DOWN:
            initialX = overlayParams.x;
            initialY = overlayParams.y;
            initialTouchX = event.getRawX();
            initialTouchY = event.getRawY();
            return true;
          case MotionEvent.ACTION_MOVE:
            overlayParams.x = initialX - (int) (event.getRawX() - initialTouchX);
            overlayParams.y = initialY + (int) (event.getRawY() - initialTouchY);
            try {
              windowManager.updateViewLayout(overlayView, overlayParams);
            } catch (Exception ignored) {
              // ignore
            }
            return true;
          case MotionEvent.ACTION_UP:
            // treat as click if movement small
            float deltaX = Math.abs(event.getRawX() - initialTouchX);
            float deltaY = Math.abs(event.getRawY() - initialTouchY);
            if (deltaX < 10 && deltaY < 10) {
              v.performClick();
            }
            return true;
          default:
            return false;
        }
      }
    });
  }

  private void setWidgetPreference(boolean enabled) {
    Context context = getContext();
    if (context == null) {
      return;
    }
    context
        .getSharedPreferences(PREF_FILE, Context.MODE_PRIVATE)
        .edit()
        .putBoolean(KEY_WIDGET_ENABLED, enabled)
        .apply();
  }

  private boolean isWidgetEnabled() {
    Context context = getContext();
    if (context == null) {
      return false;
    }
    return context
        .getSharedPreferences(PREF_FILE, Context.MODE_PRIVATE)
        .getBoolean(KEY_WIDGET_ENABLED, false);
  }

  private boolean hasOverlayPermission() {
    if (Build.VERSION.SDK_INT < Build.VERSION_CODES.M) {
      return true;
    }
    Context context = getContext();
    return context != null && Settings.canDrawOverlays(context);
  }
}